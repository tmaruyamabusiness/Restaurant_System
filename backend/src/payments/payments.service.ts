import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { computeTotals, OrderItemStatus, PaymentCreateRequest, PaymentResponse } from "@oms/shared";
import { EventsGateway } from "../events/events.gateway";
import { toPayment, toTakeout, TAKEOUT_INCLUDE } from "../common/serializers";
import { PrismaService } from "../prisma.service";
import { SeatsService } from "../seats/seats.service";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly seats: SeatsService,
    private readonly events: EventsGateway
  ) {}

  async create(req: PaymentCreateRequest, userId: string): Promise<PaymentResponse> {
    if (req.discount?.type === "PERCENTAGE" && req.discount.value > 100) {
      throw new BadRequestException("割引率は100%以下で指定してください");
    }

    const { paymentId, sessionId, seatId, takeoutId, orderIds } = await this.prisma.$transaction(
      async (tx) => {
        // 対象注文を行ロックして二重会計を防ぐ
        let orders;
        if (req.session_id) {
          await tx.$queryRaw`SELECT id FROM orders WHERE session_id = ${req.session_id}::uuid FOR UPDATE`;
          orders = await tx.order.findMany({
            where: { session_id: req.session_id, status: "OPEN" },
            include: { items: true },
          });
          if (orders.length === 0) {
            throw new BadRequestException("会計対象の注文がありません(既に会計済みの可能性)");
          }
        } else {
          await tx.$queryRaw`SELECT id FROM orders WHERE id = ${req.order_id}::uuid FOR UPDATE`;
          const order = await tx.order.findUnique({
            where: { id: req.order_id! },
            include: { items: true },
          });
          if (!order) throw new NotFoundException("注文が見つかりません");
          if (order.status !== "OPEN") {
            throw new BadRequestException("この注文は既に会計済みです");
          }
          orders = [order];
        }

        const totals = computeTotals(
          orders.flatMap((o) =>
            o.items.map((i) => ({
              unit_price: Number(i.unit_price),
              quantity: i.quantity,
              tax_rate: Number(i.tax_rate),
              status: i.status as OrderItemStatus,
            }))
          ),
          req.discount ?? null
        );

        const lineSum = req.lines.reduce((s, l) => s + l.amount, 0);
        if (lineSum !== totals.total_amount) {
          throw new BadRequestException(
            `支払金額の合計(¥${lineSum})が請求額(¥${totals.total_amount})と一致しません`
          );
        }

        let change = 0;
        for (const line of req.lines) {
          if (line.method === "CASH") {
            if (line.received_amount != null) {
              if (line.received_amount < line.amount) {
                throw new BadRequestException("預かり金額が支払額に足りません");
              }
              change += line.received_amount - line.amount;
            }
          } else if (line.received_amount != null && line.received_amount !== line.amount) {
            throw new BadRequestException("現金以外の支払いにお釣りは発生しません");
          }
        }

        const payment = await tx.payment.create({
          data: {
            total_amount: totals.total_amount,
            tax_amount: totals.tax_amount,
            discount_type: req.discount?.type ?? null,
            discount_value: new Prisma.Decimal(req.discount?.value ?? 0),
            discount_applied: totals.discount_applied,
            change_amount: change,
            receipt_issued: req.receipt_issued,
            created_by: userId,
            lines: {
              create: req.lines.map((l) => ({
                method: l.method,
                amount: l.amount,
                received_amount: l.received_amount ?? null,
              })),
            },
          },
        });

        const ids = orders.map((o) => o.id);
        await tx.order.updateMany({
          where: { id: { in: ids } },
          data: { status: "CLOSED", payment_id: payment.id },
        });

        let seatId: string | null = null;
        if (req.session_id) {
          // 会計完了後はテーブルを清掃待ちにする
          const session = await tx.seatSession.update({
            where: { id: req.session_id },
            data: { status: "CLEANING" },
          });
          seatId = session.seat_id;
        }

        return {
          paymentId: payment.id,
          sessionId: req.session_id ?? null,
          seatId,
          takeoutId: orders[0]?.takeout_id ?? null,
          orderIds: ids,
        };
      }
    );

    // コミット後に通知(クライアントが再取得しても確実に反映済み)
    this.events.emit("order_paid", {
      session_id: sessionId,
      takeout_id: takeoutId,
      order_ids: orderIds,
    });
    if (seatId) {
      this.events.emit("seat_status_changed", { seat: await this.seats.serializeSeat(seatId) });
    }
    if (takeoutId) {
      const takeout = await this.prisma.takeoutOrder.findUnique({
        where: { id: takeoutId },
        include: TAKEOUT_INCLUDE,
      });
      if (takeout) this.events.emit("takeout_status_changed", { takeout: toTakeout(takeout) });
    }

    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { lines: true, orders: true },
    });
    return toPayment(payment);
  }
}
