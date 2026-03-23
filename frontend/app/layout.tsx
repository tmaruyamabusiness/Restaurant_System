"use client";

import "./globals.css";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useAuthStore } from "@/stores/authStore";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { useSeatStore } from "@/stores/seatStore";
import { useOrderStore } from "@/stores/orderStore";
import { useTakeoutStore } from "@/stores/takeoutStore";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, token, loadFromStorage } = useAuthStore();
  const { updateSeat } = useSeatStore();
  const { updateOrderItem } = useOrderStore();
  const { updateTakeoutOrder } = useTakeoutStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);

    socket.on("seat_status_changed", (data: any) => {
      updateSeat(data);
    });

    socket.on("order_item_status_changed", (data: any) => {
      updateOrderItem(data.order_id, data.item_id, data.status);
    });

    socket.on("takeout_status_changed", (data: any) => {
      updateTakeoutOrder(data);
    });

    return () => {
      disconnectSocket();
    };
  }, [token, updateSeat, updateOrderItem, updateTakeoutOrder]);

  const isLoginPage = pathname === "/login";

  if (!isAuthenticated && !isLoginPage) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60 p-6 overflow-auto">{children}</main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
