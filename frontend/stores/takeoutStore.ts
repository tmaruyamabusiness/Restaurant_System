import { create } from "zustand";
import { TakeoutResponse } from "@/types";
import { api } from "@/lib/api";

interface TakeoutState {
  orders: TakeoutResponse[];
  loading: boolean;
  fetchOrders: () => Promise<void>;
  applyTakeout: (takeout: TakeoutResponse) => void;
}

export const useTakeoutStore = create<TakeoutState>((set, get) => ({
  orders: [],
  loading: false,

  fetchOrders: async () => {
    set({ loading: true });
    try {
      const orders = await api.getTakeoutOrders();
      set({ orders });
    } finally {
      set({ loading: false });
    }
  },

  applyTakeout: (takeout) => {
    const orders = get().orders;
    const exists = orders.some((o) => o.id === takeout.id);
    set({
      orders: exists
        ? orders.map((o) => (o.id === takeout.id ? takeout : o))
        : [...orders, takeout],
    });
  },
}));
