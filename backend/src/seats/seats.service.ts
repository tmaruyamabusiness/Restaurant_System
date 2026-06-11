import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { SeatResponse, SeatStatus } from "@oms/shared";
import { EventsGateway } from "../events/events.gateway";
import { toSeat } from "../common/serializers";
import { PrismaService } from "../prisma.service";

const SESSION_INCLUDE = {
  orders: { select: { status: true, total_amount: true } },
} as const;

/** 許可されるセッションの状態遷移 */
const TRANSITIONS: Record<string, SeatStatus[]> = {
  GUIDED: ["ORDERING", "BILLING"],
  ORDERING: ["BILLING"],
  BILLING: ["CLEANING"],
  CLEANING: ["VACANT"],
};

@Injectable()
export class SeatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway
  ) {}

  async serializeSeat(seatId: string, db: Prisma.TransactionClient = this.prisma): Promise<SeatResponse> {
    const seat = await db.seat.findUnique({
      where: { id: seatId },
      include: {
        sessions: {
          where: { status: { not: "CLOSED" } },
          orderBy: { seated_at: "desc" },
          take: 1,
          include: SESSION_INCLUDE,
        },
      },
    });
    if (!seat) throw new NotFoundException("席が見つかりません");
    return toSeat(seat, seat.sessions[0] ?? null);
  }

  async list(): Promise<SeatResponse[]> {
    const seats = await this.prisma.seat.findMany({
      where: { is_active: true },
      orderBy: { sort_order: "asc" },
      include: {
        sessions: {
          where: { status: { not: "CLOSED" } },
          orderBy: { seated_at: "desc" },
          take: 1,
          include: SESSION_INCLUDE,
        },
      },
    });
    return seats.map((s) => toSeat(s, s.sessions[0] ?? null));
  }

  async create(data: {
    seat_number: string;
    seat_type: "TABLE" | "COUNTER" | "PRIVATE";
    capacity: number;
    sort_order: number;
  }): Promise<SeatResponse> {
    try {
      const seat = await this.prisma.seat.create({ data });
      return toSeat(seat, null);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException(`席番号 ${data.seat_number} は既に存在します`);
      }
      throw e;
    }
  }

  async update(
    id: string,
    data: Partial<{
      seat_number: string;
      seat_type: "TABLE" | "COUNTER" | "PRIVATE";
      capacity: number;
      sort_order: number;
      is_active: boolean;
    }>
  ): Promise<SeatResponse> {
    try {
      await this.prisma.seat.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new ConflictException("席番号が重複しています");
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw new NotFoundException("席が見つかりません");
      }
      throw e;
    }
    return this.serializeSeat(id);
  }

  /** 案内: 空席チェックを行ロックで保護し、二重案内を防ぐ */
  async guide(seatId: string, partySize: number): Promise<SeatResponse> {
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        { id: string; capacity: number; is_active: boolean }[]
      >`SELECT id, capacity, is_active FROM seats WHERE id = ${seatId}::uuid FOR UPDATE`;
      const seat = rows[0];
      if (!seat || !seat.is_active) throw new NotFoundException("席が見つかりません");
      if (partySize > seat.capacity) {
        throw new BadRequestException(`定員 ${seat.capacity} 名を超えています`);
      }
      const active = await tx.seatSession.findFirst({
        where: { seat_id: seatId, status: { not: "CLOSED" } },
      });
      if (active) throw new ConflictException("この席は既に利用中です");
      await tx.seatSession.create({
        data: { seat_id: seatId, party_size: partySize, status: "GUIDED" },
      });
    });
    const seat = await this.serializeSeat(seatId);
    this.events.emit("seat_status_changed", { seat });
    return seat;
  }

  async changeStatus(seatId: string, target: SeatStatus): Promise<SeatResponse> {
    await this.prisma.$transaction(async (tx) => {
      const session = await tx.seatSession.findFirst({
        where: { seat_id: seatId, status: { not: "CLOSED" } },
        orderBy: { seated_at: "desc" },
      });
      if (!session) {
        throw new BadRequestException("利用中のセッションがありません(案内は guide を使用)");
      }
      const allowed = TRANSITIONS[session.status] ?? [];
      if (!allowed.includes(target)) {
        throw new BadRequestException(
          `${session.status} から ${target} へは変更できません(許可: ${allowed.join(", ") || "なし"})`
        );
      }
      if (target === "BILLING" || target === "VACANT") {
        const openOrders = await tx.order.count({
          where: { session_id: session.id, status: "OPEN" },
        });
        if (target === "VACANT" && openOrders > 0) {
          throw new BadRequestException("未会計の注文が残っています");
        }
      }
      if (target === "VACANT") {
        await tx.seatSession.update({
          where: { id: session.id },
          data: { status: "CLOSED", closed_at: new Date() },
        });
      } else {
        await tx.seatSession.update({ where: { id: session.id }, data: { status: target } });
      }
    });
    const seat = await this.serializeSeat(seatId);
    this.events.emit("seat_status_changed", { seat });
    return seat;
  }

  /** 注文確定時に GUIDED→ORDERING へ自動遷移させる(注文サービスから呼ばれる) */
  async markOrdering(sessionId: string, db: Prisma.TransactionClient): Promise<void> {
    await db.seatSession.updateMany({
      where: { id: sessionId, status: "GUIDED" },
      data: { status: "ORDERING" },
    });
  }
}
