const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOpts } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOpts,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchAPI<{ access_token: string; token_type: string; user: import("@/types").User }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    ),

  // Seats
  getSeats: (token: string) =>
    fetchAPI<import("@/types").Seat[]>("/api/seats", { token }),

  getSeat: (id: string, token: string) =>
    fetchAPI<import("@/types").Seat>(`/api/seats/${id}`, { token }),

  updateSeatStatus: (id: string, status: string, partySize: number | undefined, token: string) =>
    fetchAPI<import("@/types").Seat>(`/api/seats/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, party_size: partySize }),
      token,
    }),

  createSeat: (data: { number: number; type: string; capacity: number; sort_order: number }, token: string) =>
    fetchAPI<import("@/types").Seat>("/api/seats", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateSeat: (id: string, data: Partial<import("@/types").Seat>, token: string) =>
    fetchAPI<import("@/types").Seat>(`/api/seats/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),

  // Orders
  getOrders: (sessionId: string, token: string) =>
    fetchAPI<import("@/types").Order[]>(`/api/orders?session_id=${sessionId}`, { token }),

  createOrder: (data: {
    order_type: string;
    seat_session_id?: string;
    takeout_order_id?: string;
    items: { menu_item_id: string; quantity: number; notes?: string }[];
  }, token: string) =>
    fetchAPI<import("@/types").Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateOrderItemStatus: (itemId: string, status: string, token: string) =>
    fetchAPI<import("@/types").OrderItem>(`/api/orders/items/${itemId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
      token,
    }),

  // Billing / Payments
  createPayment: (data: {
    session_id?: string;
    takeout_order_id?: string;
    payments: { method: string; amount: number; received_amount?: number }[];
    discount_amount?: number;
    discount_percentage?: number;
    print_receipt?: boolean;
  }, token: string) =>
    fetchAPI<import("@/types").Payment>("/api/payments", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  // Takeout
  getTakeoutOrders: (token: string, status?: string) => {
    const query = status ? `?status=${status}` : "";
    return fetchAPI<import("@/types").TakeoutOrder[]>(`/api/takeout${query}`, { token });
  },

  getTakeoutOrder: (id: string, token: string) =>
    fetchAPI<import("@/types").TakeoutOrder>(`/api/takeout/${id}`, { token }),

  createTakeoutOrder: (data: {
    customer_name: string;
    customer_phone: string;
    pickup_time: string;
    items: { menu_item_id: string; quantity: number; notes?: string }[];
    prepay: boolean;
    payment_method?: string;
  }, token: string) =>
    fetchAPI<import("@/types").TakeoutOrder>("/api/takeout", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateTakeoutStatus: (id: string, status: string, token: string) =>
    fetchAPI<import("@/types").TakeoutOrder>(`/api/takeout/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
      token,
    }),

  // KDS
  getKDSOrders: (token: string) =>
    fetchAPI<import("@/types").KDSOrder[]>("/api/kds/orders", { token }),

  // Menu
  getCategories: (token: string) =>
    fetchAPI<import("@/types").MenuCategory[]>("/api/menu/categories", { token }),

  createCategory: (data: { name: string; sort_order: number; active: boolean }, token: string) =>
    fetchAPI<import("@/types").MenuCategory>("/api/menu/categories", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateCategory: (id: string, data: Partial<import("@/types").MenuCategory>, token: string) =>
    fetchAPI<import("@/types").MenuCategory>(`/api/menu/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),

  getMenuItems: (token: string, categoryId?: string) => {
    const query = categoryId ? `?category_id=${categoryId}` : "";
    return fetchAPI<import("@/types").MenuItem[]>(`/api/menu/items${query}`, { token });
  },

  createMenuItem: (data: Partial<import("@/types").MenuItem>, token: string) =>
    fetchAPI<import("@/types").MenuItem>("/api/menu/items", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateMenuItem: (id: string, data: Partial<import("@/types").MenuItem>, token: string) =>
    fetchAPI<import("@/types").MenuItem>(`/api/menu/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),

  // Reports
  getDailyReport: (date: string, token: string) =>
    fetchAPI<import("@/types").SalesReport>(`/api/reports/daily?date=${date}`, { token }),

  getMonthlyReport: (month: string, token: string) =>
    fetchAPI<import("@/types").MonthlySalesReport>(`/api/reports/monthly?month=${month}`, { token }),

  // Settings
  getSettings: (token: string) =>
    fetchAPI<import("@/types").SeatSettings>("/api/settings", { token }),

  updateSettings: (data: Partial<import("@/types").SeatSettings>, token: string) =>
    fetchAPI<import("@/types").SeatSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),

  // Users
  getUsers: (token: string) =>
    fetchAPI<import("@/types").User[]>("/api/users", { token }),

  createUser: (data: { email: string; name: string; password: string; role: string }, token: string) =>
    fetchAPI<import("@/types").User>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateUser: (id: string, data: Partial<import("@/types").User & { password?: string }>, token: string) =>
    fetchAPI<import("@/types").User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),
};
