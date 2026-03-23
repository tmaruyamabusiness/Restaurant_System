"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useOrderStore } from "@/stores/orderStore";
import { OrderItemStatus } from "@/types";
import { api } from "@/lib/api";
import Header from "@/components/layout/Header";
import KDSOrderCard from "@/components/kds/KDSOrderCard";

export default function KDSPage() {
  const { token } = useAuthStore();
  const { kdsOrders, loading, fetchKDSOrders, updateOrderItem } = useOrderStore();

  useEffect(() => {
    if (!token) return;
    fetchKDSOrders(token);
    const interval = setInterval(() => fetchKDSOrders(token), 15000);
    return () => clearInterval(interval);
  }, [token, fetchKDSOrders]);

  const handleItemStatusChange = async (itemId: string, status: OrderItemStatus) => {
    if (!token) return;
    try {
      await api.updateOrderItemStatus(itemId, status, token);
      fetchKDSOrders(token);
    } catch {
      // handle error
    }
  };

  const activeOrders = kdsOrders.filter((o) =>
    o.items.some((i) => i.status === "PENDING" || i.status === "COOKING")
  );

  return (
    <div className="min-h-screen">
      <Header
        title="Kitchen Display"
        subtitle={`${activeOrders.length} active orders`}
      />

      {loading && kdsOrders.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <svg className="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xl text-gray-400 font-medium">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">No pending orders</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeOrders
            .sort((a, b) => b.elapsed_minutes - a.elapsed_minutes)
            .map((order) => (
              <KDSOrderCard
                key={order.id}
                order={order}
                onItemStatusChange={handleItemStatusChange}
              />
            ))}
        </div>
      )}
    </div>
  );
}
