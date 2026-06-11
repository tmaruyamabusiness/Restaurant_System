import { create } from "zustand";
import { UserResponse } from "@/types";

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  /** localStorage の読込が完了したか。完了前にリダイレクト判定しない */
  hydrated: boolean;
  setAuth: (user: UserResponse, token: string) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  hydrated: false,

  setAuth: (user, token) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true, hydrated: true });
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    set({ user: null, token: null, isAuthenticated: false, hydrated: true });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("auth_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr) as UserResponse;
        set({ user, token, isAuthenticated: true, hydrated: true });
        return;
      } catch {
        // 壊れたデータは破棄
      }
    }
    set({ user: null, token: null, isAuthenticated: false, hydrated: true });
  },
}));
