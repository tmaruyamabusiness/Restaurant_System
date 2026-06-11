"use client";

import { cn, formatTime, getElapsedMinutes } from "@/lib/utils";
import { OrderItemStatus, OrderResponse } from "@/types";

interface KDSOrderCardProps {
  order: OrderResponse;
  onItemStatusChange: (itemId: string, status: OrderItemStatus) => void;
  onCompleteAll: (order: OrderResponse) => void;
}

function urgency(elapsed: number): "ok" | "warn" | "late" {
  if (elapsed >= 10) return "late";
  if (elapsed >= 5) return "warn";
  return "ok";
}

const BORDER = {
  ok: "border-l-emerald-500",
  warn: "border-l-amber-500",
  late: "border-l-red-500",
} as const;
const TIME_CHIP = {
  ok: "bg-emerald-950 text-emerald-400",
  warn: "bg-amber-950 text-amber-400",
  late: "bg-red-950 text-red-400 animate-pulse",
} as const;

export default function KDSOrderCard({ order, onItemStatusChange, onCompleteAll }: KDSOrderCardProps) {
  const elapsed = getElapsedMinutes(order.created_at);
  const u = urgency(elapsed);
  const title =
    order.order_type === "TAKEOUT"
      ? `🥡 ${order.customer_name ?? "テイクアウト"} #T${order.order_number}`
      : `席 #${order.seat_number ?? "-"}`;
  const activeItems = order.items.filter(
    (i) => i.status === "PENDING" || i.status === "COOKING"
  );

  return (
    <div className={cn("overflow-hidden rounded-xl border-l-[7px] bg-slate-900", BORDER[u])}>
      <div className="flex items-center justify-between bg-white/5 px-3.5 py-3">
        <span className="text-lg font-extrabold text-white">{title}</span>
        <span className={cn("rounded-full px-3 py-1 text-base font-extrabold", TIME_CHIP[u])}>
          {elapsed}分
        </span>
      </div>
      {order.order_type === "TAKEOUT" && order.pickup_at && (
        <p className="bg-amber-950/60 px-3.5 py-1.5 text-xs font-bold text-amber-400">
          ⚠ {formatTime(order.pickup_at)} 受取予定
        </p>
      )}

      {order.items
        .filter((i) => i.status !== "CANCELLED" && i.status !== "SERVED")
        .map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 border-b border-white/5 px-3.5 py-2.5"
          >
            <span className="w-9 text-base font-extrabold text-white">×{item.quantity}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-slate-200">{item.item_name}</p>
              {item.notes && (
                <p className="text-xs font-bold text-red-400">⚠ {item.notes}</p>
              )}
            </div>
            {item.status === "PENDING" ? (
              <button
                onClick={() => onItemStatusChange(item.id, "COOKING")}
                className="min-h-[40px] whitespace-nowrap rounded-lg bg-amber-700 px-3 text-xs font-bold text-white hover:bg-amber-600"
              >
                ▶ 調理開始
              </button>
            ) : (
              <button
                onClick={() => onItemStatusChange(item.id, "SERVED")}
                className="min-h-[40px] whitespace-nowrap rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white hover:bg-emerald-600"
              >
                ✓ 完了
              </button>
            )}
          </div>
        ))}

      {activeItems.length > 1 && (
        <div className="p-3">
          <button
            onClick={() => onCompleteAll(order)}
            className="min-h-[44px] w-full rounded-lg border border-teal-800 bg-teal-950 text-[13px] font-bold text-teal-300 hover:bg-teal-900"
          >
            すべて完了にする
          </button>
        </div>
      )}
    </div>
  );
}
