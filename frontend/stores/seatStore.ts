import { create } from "zustand";
import { SeatResponse } from "@/types";
import { api } from "@/lib/api";

interface SeatState {
  seats: SeatResponse[];
  loading: boolean;
  alertThreshold: number;
  fetchSeats: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  /** WebSocket からの席更新を反映 */
  applySeat: (seat: SeatResponse) => void;
}

export const useSeatStore = create<SeatState>((set, get) => ({
  seats: [],
  loading: false,
  alertThreshold: 60,

  fetchSeats: async () => {
    set({ loading: true });
    try {
      const seats = await api.getSeats();
      set({ seats });
    } finally {
      set({ loading: false });
    }
  },

  fetchSettings: async () => {
    const settings = await api.getSettings();
    set({ alertThreshold: settings.alert_threshold_minutes });
  },

  applySeat: (seat) => {
    const seats = get().seats;
    const exists = seats.some((s) => s.id === seat.id);
    set({
      seats: exists ? seats.map((s) => (s.id === seat.id ? seat : s)) : [...seats, seat],
    });
  },
}));
