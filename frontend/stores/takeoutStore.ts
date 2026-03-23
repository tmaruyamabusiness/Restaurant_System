import { create } from "zustand";
import { TakeoutOrder, TakeoutStatus } from "@/types";
import { api } from "@/lib/api";

interface TakeoutState {
  takeoutOrders: TakeoutOrder[];
  loading: boolean;
  error: string | null;
  fetchTakeoutOrders: (token: string, status?: string) => Promise<void>;
  updateTakeoutOrder: (order: TakeoutOrder) => void;
  addTakeoutOrder: (order: TakeoutOrder) => void;
}

export const useTakeoutStore = create<TakeoutState>((set) => ({
  takeoutOrders: [],
  loading: false,
  error: null,

  fetchTakeoutOrders: async (token: string, status?: string) => {
    set({ loading: true, error: null });
    try {
      const takeoutOrders = await api.getTakeoutOrders(token, status);
      set({ takeoutOrders, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  updateTakeoutOrder: (order: TakeoutOrder) => {
    set((state) => ({
      takeoutOrders: state.takeoutOrders.map((t) =>
        t.id === order.id ? order : t
      ),
    }));
  },

  addTakeoutOrder: (order: TakeoutOrder) => {
    set((state) => ({
      takeoutOrders: [order, ...state.takeoutOrders],
    }));
  },
}));
