import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  computeTotals,
  OrderCreateRequest,
  OrderItemStatus,
  OrderItemUpdateRequest,
  OrderResponse,
  taxRateFor,
} from "@oms/shared";
import { EventsGateway } from "../events/events.gateway";
import { ORDER_INCLUDE, toOrder } from "../common/serializers";
import { PrismaService } from "../prisma.service";
import { SeatsService } from "../seats/seats.service";

const ITEM_TRANSITIONS: Record<OrderItemStatus, OrderItemStatus[]> = {
  PENDING: ["COOKING", "SERVED", "CANCELLED"],
  COOKING: ["SERVED", "CANCELLED"],
  SERVED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seats: SeatsService,
    private readonly events: EventsGateway
  ) {}

  private async loadOrder(id: string, db: Prisma.TransactionClient = this.prisma) {
    const order = await db.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException("注文が見つかりません");
    return order;
  }

  async create(data: OrderCreateRequest): Promise<OrderResponse> {
    const orderId = await this.prisma.$transaction(async (tx) => {
      if (data.order_type === "DINE_IN") {
        if (!data.session_id) throw new BadRequestException("店内注文には session_id が必要です");
        const session = await tx.seatSession.findUnique({ where: { id: data.session_id } });
        if (!session) throw new NotFoundException("セッションが見つかりません");
        if (session.status !== "GUIDED" && session.status !== "ORDERING") {
          throw new BadRequestException("このセッションには注文を追加できません(会計中/清掃中)");
        }
      } else {
        if (!data.takeout_id) {
          throw new BadRequestException("テイクアウト注文には takeout_id が必要です");
        }
        const takeout = await tx.takeoutOrder.findUnique({ where: { id: data.takeout_id } });
        if (!takeout) throw new NotFoundException("テイクアウト注文が見つかりません");
        if (takeout.status !== "RECEIVED" && takeout.status !== "PREPARING") {
          throw new BadRequestException("このテイクアウトには商品を追加できません");
        }
      }

      const menuIds = data.items.map((i) => i.menu_item_id);
      const menuItems = await tx.menuItem.findMany({
        where: { id: { in: menuIds }, is_available: true },
      });
      const byId = new Map(menuItems.map((m) => [m.id, m]));
      for (const i of data.items) {
        if (!byId.has(i.menu_item_id)) {
          throw new BadRequestException("提供できない商品が含まれています");
        }
      }

      const items = data.items.map((i) => {
        const m = byId.get(i.menu_item_id)!;
        return {
          menu_item_id: m.id,
          item_name: m.name,
          unit_price: m.price,
          quantity: i.quantity,
          tax_rate: new Prisma.Decimal(taxRateFor(data.order_type, m.tax_type)),
          notes: i.notes ?? null,
        };
      });

      const totals = computeTotals(
        items.map((i) => ({
          unit_price: Number(i.unit_price),
          quantity: i.quantity,
          tax_rate: Number(i.tax_rate),
        }))
      );

      const order = await tx.order.create({
        data: {
          order_type: data.order_type,
          session_id: data.session_id ?? null,
          takeout_id: data.takeout_id ?? null,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_amount,
          total_amount: totals.total_amount,
          items: { create: items },
        },
      });

      if (data.order_type === "DINE_IN" && data.session_id) {
        await this.seats.markOrdering(data.session_id, tx);
      }
      return order.id;
    });

    const order = toOrder(await this.loadOrder(orderId));
    this.events.emit("new_order", { order });
    if (order.session_id) {
      const seat = await this.seats.serializeSeat(
        (await this.prisma.seatSession.findUniqueOrThrow({ where: { id: order.session_id } }))
          .seat_id
      );
      this.events.emit("seat_status_changed", { seat });
    }
    return order;
  }

  async listForSession(sessionId: string): Promise<OrderResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: { session_id: sessionId },
      orderBy: { created_at: "desc" },
      include: ORDER_INCLUDE,
    });
    return orders.map(toOrder);
  }

  async kdsList(): Promise<OrderResponse[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        status: "OPEN",
        items: { some: { status: { in: ["PENDING", "COOKING"] } } },
      },
      orderBy: { created_at: "asc" },
      include: ORDER_INCLUDE,
    });
    return orders.map(toOrder);
  }

  async updateItem(
    orderId: string,
    itemId: string,
    data: OrderItemUpdateRequest
  ): Promise<OrderResponse> {
    await this.prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({ where: { id: itemId } });
      if (!item || item.order_id !== orderId) {
        throw new NotFoundException("注文アイテムが見つかりません");
      }
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
      if (order.status !== "OPEN") {
        throw new BadRequestException("会計済み/取消済みの注文は変更できません");
      }
      if (data.status && data.status !== item.status) {
        const allowed = ITEM_TRANSITIONS[item.status as OrderItemStatus] ?? [];
        if (!allowed.includes(data.status)) {
          throw new BadRequestException(`${item.status} から ${data.status} へは変更できません`);
        }
      }
      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          status: data.status ?? undefined,
          quantity: data.quantity ?? undefined,
          notes: data.notes ?? undefined,
        },
      });
      await this.recalculate(orderId, tx);
    });
    const order = toOrder(await this.loadOrder(orderId));
    this.events.emit("order_item_status_changed", { order, item_id: itemId });
    return order;
  }

  /** KDS からはアイテム ID のみで更新できるようにする */
  async updateItemByKds(itemId: string, status: OrderItemStatus): Promise<OrderResponse> {
    const item = await this.prisma.orderItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException("注文アイテムが見つかりません");
    return this.updateItem(item.order_id, itemId, { status });
  }

  /** キャンセル等で金額が変わるため、変更のたびに合計を再計算する */
  async recalculate(orderId: string, db: Prisma.TransactionClient): Promise<void> {
    const items = await db.orderItem.findMany({ where: { order_id: orderId } });
    const totals = computeTotals(
      items.map((i) => ({
        unit_price: Number(i.unit_price),
        quantity: i.quantity,
        tax_rate: Number(i.tax_rate),
        status: i.status as OrderItemStatus,
      }))
    );
    await db.order.update({
      where: { id: orderId },
      data: {
        subtotal: totals.subtotal,
        tax_amount: totals.tax_amount,
        total_amount: totals.total_amount,
      },
    });
  }
}
