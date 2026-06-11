import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { DailyReportResponse, MonthlyReportResponse, PaymentMethod } from "@oms/shared";
import { Roles } from "../common/auth";
import { config } from "../config";
import { PrismaService } from "../prisma.service";

/** 営業日は店舗タイムゾーン(JST)基準。UTC日界による前日混入を防ぐ */
function jstDayRange(date: string): { start: Date; end: Date } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestException("date は YYYY-MM-DD 形式で指定してください");
  }
  const start = new Date(`${date}T00:00:00${config.storeTzOffset}`);
  if (Number.isNaN(start.getTime())) throw new BadRequestException("日付が不正です");
  return { start, end: new Date(start.getTime() + 24 * 3600 * 1000) };
}

function todayJst(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function jstHour(d: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tokyo", hour: "2-digit", hour12: false })
      .format(d)
  );
}

function jstDate(d: Date): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
}

@Controller("api/reports")
@Roles("OWNER", "MANAGER")
export class ReportsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("daily")
  async daily(@Query("date") date?: string): Promise<DailyReportResponse> {
    const target = date ?? todayJst();
    const { start, end } = jstDayRange(target);

    const payments = await this.prisma.payment.findMany({
      where: { created_at: { gte: start, lt: end } },
      include: { lines: true, orders: { include: { items: true, session: true } } },
    });

    const netSales = payments.reduce((s, p) => s + Number(p.total_amount), 0);
    const discountTotal = payments.reduce((s, p) => s + Number(p.discount_applied), 0);
    const taxTotal = payments.reduce((s, p) => s + Number(p.tax_amount), 0);
    const orders = payments.flatMap((p) => p.orders);

    const sessionGuests = new Map<string, number>();
    for (const o of orders) {
      if (o.session) sessionGuests.set(o.session.id, o.session.party_size);
    }

    const byMethod = new Map<string, { amount: number; count: number }>();
    for (const p of payments) {
      for (const l of p.lines) {
        const cur = byMethod.get(l.method) ?? { amount: 0, count: 0 };
        cur.amount += Number(l.amount);
        cur.count += 1;
        byMethod.set(l.method, cur);
      }
    }

    const byHour = new Map<number, { amount: number; count: number }>();
    for (const p of payments) {
      const h = jstHour(p.created_at);
      const cur = byHour.get(h) ?? { amount: 0, count: 0 };
      cur.amount += Number(p.total_amount);
      cur.count += 1;
      byHour.set(h, cur);
    }

    const byItem = new Map<string, { quantity: number; amount: number }>();
    for (const o of orders) {
      for (const i of o.items) {
        if (i.status === "CANCELLED") continue;
        const cur = byItem.get(i.item_name) ?? { quantity: 0, amount: 0 };
        cur.quantity += i.quantity;
        cur.amount += Number(i.unit_price) * i.quantity;
        byItem.set(i.item_name, cur);
      }
    }

    return {
      date: target,
      order_count: orders.length,
      guest_count: [...sessionGuests.values()].reduce((s, n) => s + n, 0),
      gross_sales: netSales + discountTotal,
      discount_total: discountTotal,
      tax_total: taxTotal,
      net_sales: netSales,
      by_payment_method: [...byMethod.entries()].map(([method, v]) => ({
        method: method as PaymentMethod,
        ...v,
      })),
      by_hour: [...byHour.entries()]
        .map(([hour, v]) => ({ hour, ...v }))
        .sort((a, b) => a.hour - b.hour),
      top_items: [...byItem.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
    };
  }

  @Get("monthly")
  async monthly(
    @Query("year") yearStr?: string,
    @Query("month") monthStr?: string
  ): Promise<MonthlyReportResponse> {
    const now = todayJst();
    const year = yearStr ? Number(yearStr) : Number(now.slice(0, 4));
    const month = monthStr ? Number(monthStr) : Number(now.slice(5, 7));
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException("year / month の指定が不正です");
    }
    const start = new Date(
      `${year}-${String(month).padStart(2, "0")}-01T00:00:00${config.storeTzOffset}`
    );
    const end = new Date(
      `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}-01T00:00:00${config.storeTzOffset}`
    );

    const payments = await this.prisma.payment.findMany({
      where: { created_at: { gte: start, lt: end } },
      include: { orders: { select: { id: true } } },
    });

    const byDay = new Map<string, { amount: number; count: number }>();
    for (const p of payments) {
      const d = jstDate(p.created_at);
      const cur = byDay.get(d) ?? { amount: 0, count: 0 };
      cur.amount += Number(p.total_amount);
      cur.count += p.orders.length;
      byDay.set(d, cur);
    }

    const netSales = payments.reduce((s, p) => s + Number(p.total_amount), 0);
    const discountTotal = payments.reduce((s, p) => s + Number(p.discount_applied), 0);

    return {
      year,
      month,
      order_count: payments.reduce((s, p) => s + p.orders.length, 0),
      gross_sales: netSales + discountTotal,
      net_sales: netSales,
      by_day: [...byDay.entries()]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }
}
