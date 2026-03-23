import { create } from "zustand";
import { Order, KDSOrder } from "@/types";
import { api } from "@/lib/api";

interface OrderState {
  orders: Order[];
  kdsOrders: KDSOrder[];
  loading: boolean;
  error: string | null;
  fetchOrders: (sessionId: string, token: string) => Promise<void>;
  fetchKDSOrders: (token: string) => Promise<void>;
  addOrder: (order: Order) => void;
  updateOrderItem: (orderId: string, itemId: string, status: string) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  kdsOrders: [],
  loading: false,
  error: null,

  fetchOrders: async (sessionId: string, token: string) => {
    set({ loading: true, error: null });
    try {
      const orders = await api.getOrders(sessionId, token);
      set({ orders, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchKDSOrders: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const kdsOrders = await api.getKDSOrders(token);
      set({ kdsOrders, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  addOrder: (order: Order) => {
    set((state) => ({
      orders: [...state.orders, order],
    }));
  },

  updateOrderItem: (orderId: string, itemId: string, status: string) => {
    set((state) => ({
      orders: state.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              items: o.items.map((i) =>
                i.id === itemId ? { ...i, status: status as any } : i
              ),
            }
          : o
      ),
      kdsOrders: state.kdsOrders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              items: o.items.map((i) =>
                i.id === itemId ? { ...i, status: status as any } : i
              ),
            }
          : o
      ),
    }));
  },
}));
