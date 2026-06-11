import { z } from "zod";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UserRole = z.enum(["OWNER", "MANAGER", "STAFF"]);
export type UserRole = z.infer<typeof UserRole>;

export const SeatType = z.enum(["TABLE", "COUNTER", "PRIVATE"]);
export type SeatType = z.infer<typeof SeatType>;

/** Seat status as displayed. VACANT means "no active session". */
export const SeatStatus = z.enum(["VACANT", "GUIDED", "ORDERING", "BILLING", "CLEANING"]);
export type SeatStatus = z.infer<typeof SeatStatus>;

export const OrderType = z.enum(["DINE_IN", "TAKEOUT"]);
export type OrderType = z.infer<typeof OrderType>;

export const OrderStatus = z.enum(["OPEN", "CLOSED", "CANCELLED"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const OrderItemStatus = z.enum(["PENDING", "COOKING", "SERVED", "CANCELLED"]);
export type OrderItemStatus = z.infer<typeof OrderItemStatus>;

export const TaxType = z.enum(["STANDARD_10", "REDUCED_8"]);
export type TaxType = z.infer<typeof TaxType>;

export const DiscountType = z.enum(["FIXED", "PERCENTAGE"]);
export type DiscountType = z.infer<typeof DiscountType>;

export const PaymentMethod = z.enum(["CASH", "CREDIT_CARD", "QR"]);
export type PaymentMethod = z.infer<typeof PaymentMethod>;

export const TakeoutStatus = z.enum(["RECEIVED", "PREPARING", "READY", "PICKED_UP", "CANCELLED"]);
export type TakeoutStatus = z.infer<typeof TakeoutStatus>;

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const UserResponse = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: UserRole,
  is_active: z.boolean(),
});
export type UserResponse = z.infer<typeof UserResponse>;

export const LoginResponse = z.object({
  access_token: z.string(),
  user: UserResponse,
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const UserCreateRequest = z.object({
  username: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: UserRole,
});
export type UserCreateRequest = z.infer<typeof UserCreateRequest>;

export const UserUpdateRequest = z.object({
  username: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: UserRole.optional(),
  is_active: z.boolean().optional(),
});
export type UserUpdateRequest = z.infer<typeof UserUpdateRequest>;

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

export const MenuItemResponse = z.object({
  id: z.string(),
  category_id: z.string(),
  name: z.string(),
  price: z.number(),
  tax_type: TaxType,
  is_available: z.boolean(),
  sort_order: z.number(),
});
export type MenuItemResponse = z.infer<typeof MenuItemResponse>;

export const MenuCategoryResponse = z.object({
  id: z.string(),
  name: z.string(),
  sort_order: z.number(),
  is_active: z.boolean(),
  items: z.array(MenuItemResponse).optional(),
});
export type MenuCategoryResponse = z.infer<typeof MenuCategoryResponse>;

export const MenuCategoryCreateRequest = z.object({
  name: z.string().min(1).max(100),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});
export type MenuCategoryCreateRequest = z.infer<typeof MenuCategoryCreateRequest>;

export const MenuCategoryUpdateRequest = MenuCategoryCreateRequest.partial();
export type MenuCategoryUpdateRequest = z.infer<typeof MenuCategoryUpdateRequest>;

export const MenuItemCreateRequest = z.object({
  category_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  price: z.number().int().min(0),
  tax_type: TaxType.default("STANDARD_10"),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});
export type MenuItemCreateRequest = z.infer<typeof MenuItemCreateRequest>;

export const MenuItemUpdateRequest = MenuItemCreateRequest.partial();
export type MenuItemUpdateRequest = z.infer<typeof MenuItemUpdateRequest>;

// ---------------------------------------------------------------------------
// Seats
// ---------------------------------------------------------------------------

export const SeatSessionResponse = z.object({
  id: z.string(),
  seat_id: z.string(),
  status: SeatStatus,
  party_size: z.number(),
  seated_at: z.string(),
  closed_at: z.string().nullable(),
  open_order_count: z.number(),
  open_order_total: z.number(),
});
export type SeatSessionResponse = z.infer<typeof SeatSessionResponse>;

export const SeatResponse = z.object({
  id: z.string(),
  seat_number: z.string(),
  seat_type: SeatType,
  capacity: z.number(),
  sort_order: z.number(),
  is_active: z.boolean(),
  status: SeatStatus,
  current_session: SeatSessionResponse.nullable(),
});
export type SeatResponse = z.infer<typeof SeatResponse>;

export const SeatCreateRequest = z.object({
  seat_number: z.string().min(1).max(20),
  seat_type: SeatType,
  capacity: z.number().int().min(1).max(50),
  sort_order: z.number().int().default(0),
});
export type SeatCreateRequest = z.infer<typeof SeatCreateRequest>;

export const SeatUpdateRequest = SeatCreateRequest.partial().extend({
  is_active: z.boolean().optional(),
});
export type SeatUpdateRequest = z.infer<typeof SeatUpdateRequest>;

export const GuideRequest = z.object({
  party_size: z.number().int().min(1).max(50),
});
export type GuideRequest = z.infer<typeof GuideRequest>;

export const SeatStatusChangeRequest = z.object({
  status: SeatStatus,
});
export type SeatStatusChangeRequest = z.infer<typeof SeatStatusChangeRequest>;

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const OrderItemCreate = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().max(255).optional(),
});
export type OrderItemCreate = z.infer<typeof OrderItemCreate>;

export const OrderCreateRequest = z.object({
  order_type: OrderType,
  session_id: z.string().uuid().optional(),
  takeout_id: z.string().uuid().optional(),
  items: z.array(OrderItemCreate).min(1),
});
export type OrderCreateRequest = z.infer<typeof OrderCreateRequest>;

export const OrderItemUpdateRequest = z.object({
  status: OrderItemStatus.optional(),
  quantity: z.number().int().min(1).max(99).optional(),
  notes: z.string().max(255).optional(),
});
export type OrderItemUpdateRequest = z.infer<typeof OrderItemUpdateRequest>;

export const OrderItemResponse = z.object({
  id: z.string(),
  order_id: z.string(),
  menu_item_id: z.string().nullable(),
  item_name: z.string(),
  unit_price: z.number(),
  quantity: z.number(),
  tax_rate: z.number(),
  status: OrderItemStatus,
  notes: z.string().nullable(),
});
export type OrderItemResponse = z.infer<typeof OrderItemResponse>;

export const OrderResponse = z.object({
  id: z.string(),
  order_number: z.number(),
  order_type: OrderType,
  status: OrderStatus,
  session_id: z.string().nullable(),
  takeout_id: z.string().nullable(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  created_at: z.string(),
  items: z.array(OrderItemResponse),
  /** Extra display context for KDS / lists */
  seat_number: z.string().nullable(),
  customer_name: z.string().nullable(),
  pickup_at: z.string().nullable(),
});
export type OrderResponse = z.infer<typeof OrderResponse>;

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export const PaymentLineInput = z.object({
  method: PaymentMethod,
  amount: z.number().int().min(0),
  received_amount: z.number().int().min(0).optional(),
});
export type PaymentLineInput = z.infer<typeof PaymentLineInput>;

export const DiscountInput = z.object({
  type: DiscountType,
  value: z.number().min(0),
});
export type DiscountInput = z.infer<typeof DiscountInput>;

/** Settles every OPEN order of a seat session (or a single takeout order). */
export const PaymentCreateRequest = z
  .object({
    session_id: z.string().uuid().optional(),
    order_id: z.string().uuid().optional(),
    lines: z.array(PaymentLineInput).min(1),
    discount: DiscountInput.optional(),
    receipt_issued: z.boolean().default(true),
  })
  .refine((v) => !!v.session_id !== !!v.order_id, {
    message: "session_id と order_id はどちらか一方を指定してください",
  });
export type PaymentCreateRequest = z.infer<typeof PaymentCreateRequest>;

export const PaymentResponse = z.object({
  id: z.string(),
  total_amount: z.number(),
  tax_amount: z.number(),
  discount_type: DiscountType.nullable(),
  discount_value: z.number(),
  discount_applied: z.number(),
  change_amount: z.number(),
  receipt_issued: z.boolean(),
  created_at: z.string(),
  order_ids: z.array(z.string()),
  lines: z.array(
    z.object({
      method: PaymentMethod,
      amount: z.number(),
      received_amount: z.number().nullable(),
    })
  ),
});
export type PaymentResponse = z.infer<typeof PaymentResponse>;

// ---------------------------------------------------------------------------
// Takeout
// ---------------------------------------------------------------------------

export const TakeoutCreateRequest = z.object({
  customer_name: z.string().min(1).max(100),
  phone_number: z
    .string()
    .min(10)
    .max(20)
    .regex(/^[0-9+\-() ]+$/, "電話番号の形式が不正です"),
  pickup_at: z.string().datetime({ offset: true }),
  notes: z.string().max(255).optional(),
  items: z.array(OrderItemCreate).min(1),
});
export type TakeoutCreateRequest = z.infer<typeof TakeoutCreateRequest>;

export const TakeoutStatusChangeRequest = z.object({
  status: TakeoutStatus,
});
export type TakeoutStatusChangeRequest = z.infer<typeof TakeoutStatusChangeRequest>;

export const TakeoutResponse = z.object({
  id: z.string(),
  customer_name: z.string(),
  phone_number: z.string(),
  pickup_at: z.string(),
  status: TakeoutStatus,
  notes: z.string().nullable(),
  created_at: z.string(),
  paid: z.boolean(),
  total_amount: z.number(),
  orders: z.array(OrderResponse),
});
export type TakeoutResponse = z.infer<typeof TakeoutResponse>;

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const DailyReportResponse = z.object({
  date: z.string(),
  order_count: z.number(),
  guest_count: z.number(),
  gross_sales: z.number(),
  discount_total: z.number(),
  tax_total: z.number(),
  net_sales: z.number(),
  by_payment_method: z.array(
    z.object({ method: PaymentMethod, amount: z.number(), count: z.number() })
  ),
  by_hour: z.array(z.object({ hour: z.number(), amount: z.number(), count: z.number() })),
  top_items: z.array(z.object({ name: z.string(), quantity: z.number(), amount: z.number() })),
});
export type DailyReportResponse = z.infer<typeof DailyReportResponse>;

export const MonthlyReportResponse = z.object({
  year: z.number(),
  month: z.number(),
  order_count: z.number(),
  gross_sales: z.number(),
  net_sales: z.number(),
  by_day: z.array(z.object({ date: z.string(), amount: z.number(), count: z.number() })),
});
export type MonthlyReportResponse = z.infer<typeof MonthlyReportResponse>;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export const SettingsResponse = z.object({
  store_name: z.string(),
  alert_threshold_minutes: z.number(),
});
export type SettingsResponse = z.infer<typeof SettingsResponse>;

export const SettingsUpdateRequest = z.object({
  store_name: z.string().min(1).max(100).optional(),
  alert_threshold_minutes: z.number().int().min(1).max(600).optional(),
});
export type SettingsUpdateRequest = z.infer<typeof SettingsUpdateRequest>;

// ---------------------------------------------------------------------------
// WebSocket events (server -> client)
// ---------------------------------------------------------------------------

export interface WsEvents {
  seat_status_changed: { seat: SeatResponse };
  new_order: { order: OrderResponse };
  order_items_added: { order: OrderResponse };
  order_item_status_changed: { order: OrderResponse; item_id: string };
  order_paid: { session_id: string | null; takeout_id: string | null; order_ids: string[] };
  takeout_status_changed: { takeout: TakeoutResponse };
}
export type WsEventName = keyof WsEvents;

// ---------------------------------------------------------------------------
// Money helpers (shared so the UI preview matches the server result exactly)
// ---------------------------------------------------------------------------

export const TAX_RATE: Record<TaxType, number> = {
  STANDARD_10: 0.1,
  REDUCED_8: 0.08,
};

export interface PricedItem {
  unit_price: number;
  quantity: number;
  tax_rate: number;
  status?: OrderItemStatus;
}

export interface OrderTotals {
  subtotal: number;
  discount_applied: number;
  tax_amount: number;
  total_amount: number;
}

/**
 * Computes order totals in integer yen.
 * Discount applies to the pre-tax subtotal (allocated proportionally across
 * tax-rate groups); tax is floored per rate group (消費税の端数は切り捨て)。
 * All arithmetic is integer-based to avoid floating point drift.
 */
export function computeTotals(
  items: PricedItem[],
  discount?: { type: DiscountType; value: number } | null
): OrderTotals {
  const active = items.filter((i) => i.status !== "CANCELLED");
  const subtotal = active.reduce((s, i) => s + Math.round(i.unit_price) * i.quantity, 0);

  let discountApplied = 0;
  if (discount && discount.value > 0 && subtotal > 0) {
    discountApplied =
      discount.type === "FIXED"
        ? Math.min(subtotal, Math.round(discount.value))
        : Math.min(subtotal, Math.round((subtotal * Math.min(discount.value, 100)) / 100));
  }

  const byPercent = new Map<number, number>();
  for (const i of active) {
    const base = Math.round(i.unit_price) * i.quantity;
    const percent = Math.round(i.tax_rate * 100);
    byPercent.set(percent, (byPercent.get(percent) ?? 0) + base);
  }
  let tax = 0;
  for (const [percent, base] of byPercent) {
    const allocatedDiscount = subtotal > 0 ? Math.round((discountApplied * base) / subtotal) : 0;
    tax += Math.floor(((base - allocatedDiscount) * percent) / 100);
  }

  return {
    subtotal,
    discount_applied: discountApplied,
    tax_amount: tax,
    total_amount: subtotal - discountApplied + tax,
  };
}

/** Tax rate for one menu item in a given order context (軽減税率対応). */
export function taxRateFor(orderType: OrderType, taxType: TaxType): number {
  if (orderType === "DINE_IN") return TAX_RATE.STANDARD_10;
  return TAX_RATE[taxType];
}
