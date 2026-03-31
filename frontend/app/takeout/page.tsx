"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTakeoutStore } from "@/stores/takeoutStore";
import { TakeoutStatus } from "@/types";
import { api } from "@/lib/api";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import TakeoutCard from "@/components/takeout/TakeoutCard";
import { cn } from "@/lib/utils";

const statusFilters: { value: TakeoutStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "すべて" },
  { value: "RECEIVED", label: "受付済" },
  { value: "PREPARING", label: "調理中" },
  { value: "READY", label: "受渡準備完了" },
  { value: "PICKED_UP", label: "受取済" },
];

export default function TakeoutListPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { takeoutOrders, loading, fetchTakeoutOrders, updateTakeoutOrder } = useTakeoutStore();
  const [filter, setFilter] = useState<TakeoutStatus | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      fetchTakeoutOrders(token);
    }
  }, [token, fetchTakeoutOrders]);

  const handleStatusChange = async (id: string, status: TakeoutStatus) => {
    if (!token) return;
    try {
      const updated = await api.updateTakeoutStatus(id, status, token);
      updateTakeoutOrder(updated);
    } catch {
      // handle error
    }
  };

  const filtered =
    filter === "ALL"
      ? takeoutOrders
      : takeoutOrders.filter((o) => o.status === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.pickup_time).getTime() - new Date(b.pickup_time).getTime()
  );

  const statusCounts = takeoutOrders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div>
      <Header
        title="テイクアウト注文"
        subtitle={`${takeoutOrders.length}件の注文`}
        actions={
          <Button onClick={() => router.push("/takeout/new")}>
            + テイクアウト新規
          </Button>
        }
      />

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setFilter(sf.value)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px] relative",
              filter === sf.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {sf.label}
            {sf.value !== "ALL" && statusCounts[sf.value] ? (
              <span
                className={cn(
                  "ml-2 px-1.5 py-0.5 rounded-full text-xs",
                  filter === sf.value ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"
                )}
              >
                {statusCounts[sf.value]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {loading && takeoutOrders.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-gray-500">テイクアウト注文がありません</p>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {sorted.map((order) => (
            <TakeoutCard
              key={order.id}
              order={order}
              expanded={expandedId === order.id}
              onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
