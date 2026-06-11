import { Prisma } from "@prisma/client";
import {
  OrderResponse,
  PaymentResponse,
  SeatResponse,
  SeatSessionResponse,
  SeatStatus,
  TakeoutResponse,
  UserResponse,
  MenuCategoryResponse,
  MenuItemResponse,
} from "@oms/shared";

const num = (d: Prisma.Decimal | number | null | undefined): number =>
  d == null ? 0 : Math.round(Number(d));

const iso = (d: Date): string => d.toISOString();

// ---- users ----------------------------------------------------------------

export function toUser(u: {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
}): UserResponse {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role as UserResponse["role"],
    is_active: u.is_active,
  };
}

// ---- menu -----------------------------------------------------------------

export function toMenuItem(m: {
  id: string;
  category_id: string;
  name: string;
  price: Prisma.Decimal;
  tax_type: string;
  is_available: boolean;
  sort_order: number;
}): MenuItemResponse {
  return {
    id: m.id,
    category_id: m.category_id,
    name: m.name,
    price: num(m.price),
    tax_type: m.tax_type as MenuItemResponse["tax_type"],
    is_available: m.is_available,
    sort_order: m.sort_order,
  };
}

export function toMenuCategory(c: {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  items?: Parameters<typeof toMenuItem>[0][];
}): MenuCategoryResponse {
  return {
    id: c.id,
    name: c.name,
    sort_order: c.sort_order,
    is_active: c.is_active,
    items: c.items?.map(toMenuItem),
  };
}

// ---- seats ----------------------------------------------------------------

type SessionWithOrders = {
  id: string;
  seat_id: string;
  status: string;
  party_size: number;
  seated_at: Date;
  closed_at: Date | null;
  orders?: { status: string; total_amount: Prisma.Decimal }[];
};

export function toSession(s: SessionWithOrders): SeatSessionResponse {
  const open = (s.orders ?? []).filter((o) => o.status === "OPEN");
  const all = (s.orders ?? []).filter((o) => o.status !== "CANCELLED");
  return {
    id: s.id,
    seat_id: s.seat_id,
    status: (s.status === "CLOSED" ? "VACANT" : s.status) as SeatStatus,
    party_size: s.party_size,
    seated_at: iso(s.seated_at),
    closed_at: s.closed_at ? iso(s.closed_at) : null,
    open_order_count: open.length,
    open_order_total: all.reduce((sum, o) => sum + num(o.total_amount), 0),
  };
}

export function toSeat(
  seat: {
    id: string;
    seat_number: string;
    seat_type: string;
    capacity: number;
    sort_order: number;
    is_active: boolean;
  },
  activeSession: SessionWithOrders | null
): SeatResponse {
  return {
    id: seat.id,
    seat_number: seat.seat_number,
    seat_type: seat.seat_type as SeatResponse["seat_type"],
    capacity: seat.capacity,
    sort_order: seat.sort_order,
    is_active: seat.is_active,
    status: activeSession ? (activeSession.status as SeatStatus) : "VACANT",
    current_session: activeSession ? toSession(activeSession) : null,
  };
}

// ---- orders ---------------------------------------------------------------

type OrderFull = Prisma.OrderGetPayload<{
  include: {
    items: true;
    session: { include: { seat: true } };
    takeout: true;
  };
}>;

export function toOrder(o: OrderFull): OrderResponse {
  return {
    id: o.id,
    order_number: o.order_number,
    order_type: o.order_type as OrderResponse["order_type"],
    status: o.status as OrderResponse["status"],
    session_id: o.session_id,
    takeout_id: o.takeout_id,
    subtotal: num(o.subtotal),
    tax_amount: num(o.tax_amount),
    total_amount: num(o.total_amount),
    created_at: iso(o.created_at),
    items: o.items.map((i) => ({
      id: i.id,
      order_id: i.order_id,
      menu_item_id: i.menu_item_id,
      item_name: i.item_name,
      unit_price: num(i.unit_price),
      quantity: i.quantity,
      tax_rate: Number(i.tax_rate),
      status: i.status as OrderResponse["items"][number]["status"],
      notes: i.notes,
    })),
    seat_number: o.session?.seat?.seat_number ?? null,
    customer_name: o.takeout?.customer_name ?? null,
    pickup_at: o.takeout ? iso(o.takeout.pickup_at) : null,
  };
}

export const ORDER_INCLUDE = {
  items: true,
  session: { include: { seat: true } },
  takeout: true,
} satisfies Prisma.OrderInclude;

// ---- payments ---------------------------------------------------------------

type PaymentFull = Prisma.PaymentGetPayload<{ include: { lines: true; orders: true } }>;

export function toPayment(p: PaymentFull): PaymentResponse {
  return {
    id: p.id,
    total_amount: num(p.total_amount),
    tax_amount: num(p.tax_amount),
    discount_type: (p.discount_type as PaymentResponse["discount_type"]) ?? null,
    discount_value: num(p.discount_value),
    discount_applied: num(p.discount_applied),
    change_amount: num(p.change_amount),
    receipt_issued: p.receipt_issued,
    created_at: iso(p.created_at),
    order_ids: p.orders.map((o) => o.id),
    lines: p.lines.map((l) => ({
      method: l.method as PaymentResponse["lines"][number]["method"],
      amount: num(l.amount),
      received_amount: l.received_amount == null ? null : num(l.received_amount),
    })),
  };
}

// ---- takeout ----------------------------------------------------------------

type TakeoutFull = Prisma.TakeoutOrderGetPayload<{
  include: { orders: { include: typeof ORDER_INCLUDE } };
}>;

export function toTakeout(t: TakeoutFull): TakeoutResponse {
  const orders = t.orders.filter((o) => o.status !== "CANCELLED");
  return {
    id: t.id,
    customer_name: t.customer_name,
    phone_number: t.phone_number,
    pickup_at: iso(t.pickup_at),
    status: t.status as TakeoutResponse["status"],
    notes: t.notes,
    created_at: iso(t.created_at),
    paid: orders.length > 0 && orders.every((o) => o.status === "CLOSED"),
    total_amount: orders.reduce((s, o) => s + num(o.total_amount), 0),
    orders: t.orders.map((o) => toOrder(o as OrderFull)),
  };
}

export const TAKEOUT_INCLUDE = {
  orders: { include: ORDER_INCLUDE },
} satisfies Prisma.TakeoutOrderInclude;
