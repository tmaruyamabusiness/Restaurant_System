import { create } from "zustand";
import { OrderResponse } from "@/types";
import { api } from "@/lib/api";

interface OrderState {
  /** 表示中セッションの注文(席詳細・会計画面) */
  sessionOrders: OrderResponse[];
  kdsOrders: OrderResponse[];
  loading: boolean;
  fetchSessionOrders: (sessionId: string) => Promise<void>;
  clearSessionOrders: () => void;
  fetchKdsOrders: () => Promise<void>;
  /** WebSocket / API レスポンスの注文1件を両リストへ反映 */
  applyOrder: (order: OrderResponse) => void;
}

function upsert(list: OrderResponse[], order: OrderResponse): OrderResponse[] {
  return list.some((o) => o.id === order.id)
    ? list.map((o) => (o.id === order.id ? order : o))
    : [order, ...list];
}

const isActiveForKds = (o: OrderResponse) =>
  o.status === "OPEN" && o.items.some((i) => i.status === "PENDING" || i.status === "COOKING");

export const useOrderStore = create<OrderState>((set, get) => ({
  sessionOrders: [],
  kdsOrders: [],
  loading: false,

  fetchSessionOrders: async (sessionId) => {
    set({ loading: true });
    try {
      const orders = await api.getSessionOrders(sessionId);
      set({ sessionOrders: orders });
    } finally {
      set({ loading: false });
    }
  },

  clearSessionOrders: () => set({ sessionOrders: [] }),

  fetchKdsOrders: async () => {
    set({ loading: true });
    try {
      const orders = await api.getKdsOrders();
      set({ kdsOrders: orders });
    } finally {
      set({ loading: false });
    }
  },

  applyOrder: (order) => {
    const { sessionOrders, kdsOrders } = get();
    set({
      sessionOrders:
        sessionOrders.length > 0 && sessionOrders[0].session_id === order.session_id
          ? upsert(sessionOrders, order)
          : sessionOrders,
      kdsOrders: isActiveForKds(order)
        ? upsert(kdsOrders, order)
        : kdsOrders.filter((o) => o.id !== order.id),
    });
  },
}));
