import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { TakeoutCreateRequest, TakeoutResponse, TakeoutStatus } from "@oms/shared";
import { EventsGateway } from "../events/events.gateway";
import { toTakeout, TAKEOUT_INCLUDE } from "../common/serializers";
import { OrdersService } from "../orders/orders.service";
import { PrismaService } from "../prisma.service";

const TRANSITIONS: Record<TakeoutStatus, TakeoutStatus[]> = {
  RECEIVED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["PICKED_UP"],
  PICKED_UP: [],
  CANCELLED: [],
};

@Injectable()
export class TakeoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly events: EventsGateway
  ) {}

  private async load(id: string): Promise<TakeoutResponse> {
    const takeout = await this.prisma.takeoutOrder.findUnique({
      where: { id },
      include: TAKEOUT_INCLUDE,
    });
    if (!takeout) throw new NotFoundException("テイクアウト注文が見つかりません");
    return toTakeout(takeout);
  }

  async list(activeOnly: boolean): Promise<TakeoutResponse[]> {
    const takeouts = await this.prisma.takeoutOrder.findMany({
      where: activeOnly ? { status: { in: ["RECEIVED", "PREPARING", "READY"] } } : undefined,
      orderBy: { pickup_at: "asc" },
      take: activeOnly ? undefined : 100,
      include: TAKEOUT_INCLUDE,
    });
    return takeouts.map(toTakeout);
  }

  async get(id: string): Promise<TakeoutResponse> {
    return this.load(id);
  }

  /** 受付と同時に商品を注文として登録する(旧実装は商品が破棄されていた) */
  async create(req: TakeoutCreateRequest): Promise<TakeoutResponse> {
    const pickupAt = new Date(req.pickup_at);
    if (pickupAt.getTime() < Date.now() - 60_000) {
      throw new BadRequestException("受取時刻が過去になっています");
    }
    const takeout = await this.prisma.takeoutOrder.create({
      data: {
        customer_name: req.customer_name,
        phone_number: req.phone_number,
        pickup_at: pickupAt,
        notes: req.notes ?? null,
      },
    });
    try {
      await this.orders.create({
        order_type: "TAKEOUT",
        takeout_id: takeout.id,
        items: req.items,
      });
    } catch (e) {
      // 商品登録に失敗したら空の受付を残さない
      await this.prisma.takeoutOrder.delete({ where: { id: takeout.id } }).catch(() => undefined);
      throw e;
    }
    const result = await this.load(takeout.id);
    this.events.emit("takeout_status_changed", { takeout: result });
    return result;
  }

  async changeStatus(id: string, target: TakeoutStatus): Promise<TakeoutResponse> {
    const current = await this.load(id);
    const allowed = TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(target)) {
      throw new BadRequestException(
        `${current.status} から ${target} へは変更できません(許可: ${allowed.join(", ") || "なし"})`
      );
    }
    if (target === "PICKED_UP" && !current.paid) {
      throw new BadRequestException("未会計のため受け渡しできません。先に会計してください");
    }
    await this.prisma.takeoutOrder.update({ where: { id }, data: { status: target } });
    const result = await this.load(id);
    this.events.emit("takeout_status_changed", { takeout: result });
    return result;
  }
}
