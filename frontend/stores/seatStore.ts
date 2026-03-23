import { create } from "zustand";
import { Seat } from "@/types";
import { api } from "@/lib/api";

interface SeatState {
  seats: Seat[];
  loading: boolean;
  error: string | null;
  alertThreshold: number;
  fetchSeats: (token: string) => Promise<void>;
  updateSeat: (seat: Seat) => void;
  setAlertThreshold: (minutes: number) => void;
}

export const useSeatStore = create<SeatState>((set) => ({
  seats: [],
  loading: false,
  error: null,
  alertThreshold: 60,

  fetchSeats: async (token: string) => {
    set({ loading: true, error: null });
    try {
      const seats = await api.getSeats(token);
      set({ seats, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  updateSeat: (seat: Seat) => {
    set((state) => ({
      seats: state.seats.map((s) => (s.id === seat.id ? seat : s)),
    }));
  },

  setAlertThreshold: (minutes: number) => {
    set({ alertThreshold: minutes });
  },
}));
