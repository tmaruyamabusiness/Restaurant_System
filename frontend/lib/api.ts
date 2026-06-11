import {
  DailyReportResponse,
  GuideRequest,
  LoginRequest,
  LoginResponse,
  MenuCategoryCreateRequest,
  MenuCategoryResponse,
  MenuCategoryUpdateRequest,
  MenuItemCreateRequest,
  MenuItemResponse,
  MenuItemUpdateRequest,
  MonthlyReportResponse,
  OrderCreateRequest,
  OrderItemUpdateRequest,
  OrderItemStatus,
  OrderResponse,
  PaymentCreateRequest,
  PaymentResponse,
  SeatCreateRequest,
  SeatResponse,
  SeatStatus,
  SeatUpdateRequest,
  SettingsResponse,
  SettingsUpdateRequest,
  TakeoutCreateRequest,
  TakeoutResponse,
  TakeoutStatus,
  UserCreateRequest,
  UserResponse,
  UserUpdateRequest,
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

/** 401(トークン失効)時に呼ばれる。AppShell がログアウト処理を登録する */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

function token(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers: Record<string, string> = {};
  const t = token();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  if (init?.json !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers },
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    });
  } catch {
    throw new ApiError(0, "サーバーに接続できません。通信環境を確認してください");
  }

  if (res.status === 401 && !path.startsWith("/api/auth/login")) {
    onUnauthorized?.();
    throw new ApiError(401, "セッションの有効期限が切れました。再ログインしてください");
  }
  if (!res.ok) {
    let message = `エラーが発生しました (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
      else if (Array.isArray(body?.message)) message = body.message.join(", ");
    } catch {
      // body が JSON でない場合は既定メッセージのまま
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  // ---- auth ----
  login: (body: LoginRequest) =>
    request<LoginResponse>("/api/auth/login", { method: "POST", json: body }),
  me: () => request<UserResponse>("/api/auth/me"),

  // ---- seats ----
  getSeats: () => request<SeatResponse[]>("/api/seats"),
  getSeat: (id: string) => request<SeatResponse>(`/api/seats/${id}`),
  createSeat: (body: SeatCreateRequest) =>
    request<SeatResponse>("/api/seats", { method: "POST", json: body }),
  updateSeat: (id: string, body: SeatUpdateRequest) =>
    request<SeatResponse>(`/api/seats/${id}`, { method: "PUT", json: body }),
  guideSeat: (id: string, body: GuideRequest) =>
    request<SeatResponse>(`/api/seats/${id}/guide`, { method: "POST", json: body }),
  changeSeatStatus: (id: string, status: SeatStatus) =>
    request<SeatResponse>(`/api/seats/${id}/status`, { method: "POST", json: { status } }),

  // ---- menu ----
  getMenu: (includeInactive = false) =>
    request<MenuCategoryResponse[]>(
      `/api/menu/categories${includeInactive ? "?include_inactive=true" : ""}`
    ),
  createCategory: (body: MenuCategoryCreateRequest) =>
    request<MenuCategoryResponse>("/api/menu/categories", { method: "POST", json: body }),
  updateCategory: (id: string, body: MenuCategoryUpdateRequest) =>
    request<MenuCategoryResponse>(`/api/menu/categories/${id}`, { method: "PUT", json: body }),
  createMenuItem: (body: MenuItemCreateRequest) =>
    request<MenuItemResponse>("/api/menu/items", { method: "POST", json: body }),
  updateMenuItem: (id: string, body: MenuItemUpdateRequest) =>
    request<MenuItemResponse>(`/api/menu/items/${id}`, { method: "PUT", json: body }),

  // ---- orders / KDS ----
  createOrder: (body: OrderCreateRequest) =>
    request<OrderResponse>("/api/orders", { method: "POST", json: body }),
  getSessionOrders: (sessionId: string) =>
    request<OrderResponse[]>(`/api/orders/session/${sessionId}`),
  updateOrderItem: (orderId: string, itemId: string, body: OrderItemUpdateRequest) =>
    request<OrderResponse>(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PUT",
      json: body,
    }),
  getKdsOrders: () => request<OrderResponse[]>("/api/kds/orders"),
  updateKdsItemStatus: (itemId: string, status: OrderItemStatus) =>
    request<OrderResponse>(`/api/kds/items/${itemId}/status`, {
      method: "PUT",
      json: { status },
    }),

  // ---- payments ----
  createPayment: (body: PaymentCreateRequest) =>
    request<PaymentResponse>("/api/payments", { method: "POST", json: body }),

  // ---- takeout ----
  getTakeoutOrders: (all = false) =>
    request<TakeoutResponse[]>(`/api/takeout${all ? "?all=true" : ""}`),
  createTakeoutOrder: (body: TakeoutCreateRequest) =>
    request<TakeoutResponse>("/api/takeout", { method: "POST", json: body }),
  changeTakeoutStatus: (id: string, status: TakeoutStatus) =>
    request<TakeoutResponse>(`/api/takeout/${id}/status`, { method: "PUT", json: { status } }),

  // ---- reports ----
  getDailyReport: (date?: string) =>
    request<DailyReportResponse>(`/api/reports/daily${date ? `?date=${date}` : ""}`),
  getMonthlyReport: (year: number, month: number) =>
    request<MonthlyReportResponse>(`/api/reports/monthly?year=${year}&month=${month}`),

  // ---- users / settings ----
  getUsers: () => request<UserResponse[]>("/api/users"),
  createUser: (body: UserCreateRequest) =>
    request<UserResponse>("/api/users", { method: "POST", json: body }),
  updateUser: (id: string, body: UserUpdateRequest) =>
    request<UserResponse>(`/api/users/${id}`, { method: "PUT", json: body }),
  getSettings: () => request<SettingsResponse>("/api/settings"),
  updateSettings: (body: SettingsUpdateRequest) =>
    request<SettingsResponse>("/api/settings", { method: "PUT", json: body }),
};
