"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Toaster from "@/components/ui/Toast";
import { setUnauthorizedHandler } from "@/lib/api";
import { connectSocket, disconnectSocket, onSocketEvent } from "@/lib/socket";
import { useAuthStore } from "@/stores/authStore";
import { useOrderStore } from "@/stores/orderStore";
import { useSeatStore } from "@/stores/seatStore";
import { useTakeoutStore } from "@/stores/takeoutStore";
import { toast } from "@/stores/toastStore";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, hydrated, token, loadFromStorage, logout } = useAuthStore();
  const applySeat = useSeatStore((s) => s.applySeat);
  const applyOrder = useOrderStore((s) => s.applyOrder);
  const applyTakeout = useTakeoutStore((s) => s.applyTakeout);

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // トークン失効時は1回だけ通知してログイン画面へ
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (useAuthStore.getState().isAuthenticated) {
        logout();
        toast.error("セッションの有効期限が切れました。再ログインしてください");
        router.replace("/login");
      }
    });
  }, [logout, router]);

  // リダイレクトは hydration 完了後に副作用として行う(レンダー中に行わない)
  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated && !isLoginPage) router.replace("/login");
    if (isAuthenticated && isLoginPage) router.replace("/");
  }, [hydrated, isAuthenticated, isLoginPage, router]);

  // WebSocket 購読(ペイロードはバックエンドと型を共有)
  useEffect(() => {
    if (!token) return;
    connectSocket(token);
    const offs = [
      onSocketEvent("seat_status_changed", ({ seat }) => applySeat(seat)),
      onSocketEvent("new_order", ({ order }) => applyOrder(order)),
      onSocketEvent("order_items_added", ({ order }) => applyOrder(order)),
      onSocketEvent("order_item_status_changed", ({ order }) => applyOrder(order)),
      onSocketEvent("takeout_status_changed", ({ takeout }) => applyTakeout(takeout)),
    ];
    return () => {
      offs.forEach((off) => off());
      disconnectSocket();
    };
  }, [token, applySeat, applyOrder, applyTakeout]);

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isLoginPage || !isAuthenticated) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-60 flex-1 overflow-auto p-6">{children}</main>
      <Toaster />
    </div>
  );
}
