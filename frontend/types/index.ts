export type SeatType = "COUNTER" | "TABLE_2" | "TABLE_4";
export type SeatStatus = "VACANT" | "GUIDED" | "ORDERING" | "BILLING" | "CLEANING";
export type OrderType = "DINE_IN" | "TAKEOUT";
export type OrderItemStatus = "PENDING" | "COOKING" | "READY" | "SERVED" | "CANCELLED";
export type TakeoutStatus = "RECEIVED" | "PREPARING" | "READY" | "PICKED_UP";
export type PaymentMethod = "CASH" | "CREDIT_CARD" | "QR";
export type UserRole = "OWNER" | "MANAGER" | "STAFF";
export type TaxType = "STANDARD" | "REDUCED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Seat {
  id: string;
  number: string;
  type: SeatType;
  status: SeatStatus;
  capacity: number;
  sort_order: number;
  active: boolean;
  current_session?: SeatSession | null;
  // backend field names (aliases)
  seat_number?: string;
  seat_type?: SeatType;
  is_active?: boolean;
}

export interface SeatSession {
  id: string;
  seat_id: string;
  party_size: number;
  seated_at: string;
  closed_at?: string | null;
  orders: Order[];
}

export interface Order {
  id: string;
  order_number: string;
  order_type: OrderType;
  seat_session_id?: string | null;
  takeout_order_id?: string | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  status: OrderItemStatus;
  notes?: string;
  created_at: string;
}

export interface TakeoutOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  pickup_time: string;
  status: TakeoutStatus;
  payment_status: "UNPAID" | "PAID";
  orders: Order[];
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id?: string;
  session_id?: string;
  method: PaymentMethod;
  amount: number;
  received_amount?: number;
  change_amount?: number;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
  items?: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
  category_name?: string;
  description?: string;
  tax_type: TaxType;
  available: boolean;
  sort_order: number;
}

export interface SalesReport {
  date: string;
  total_sales: number;
  order_count: number;
  average_per_order: number;
  by_payment_method: Record<PaymentMethod, number>;
  by_order_type: Record<OrderType, number>;
  hourly: { hour: number; total: number }[];
}

export interface MonthlySalesReport {
  month: string;
  daily_totals: { date: string; total: number; order_count: number }[];
  total_sales: number;
  total_orders: number;
}

export interface SeatSettings {
  alert_threshold_minutes: number;
}

export interface KDSOrderItem extends OrderItem {
  seat_number?: number;
  order_number: string;
  order_type: OrderType;
  customer_name?: string;
  created_at: string;
}

export interface KDSOrder {
  id: string;
  order_number: string;
  order_type: OrderType;
  seat_number?: number;
  customer_name?: string;
  items: OrderItem[];
  created_at: string;
  elapsed_minutes: number;
}
