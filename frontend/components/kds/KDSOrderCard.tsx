"use client";

import { KDSOrder, OrderItemStatus } from "@/types";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";

interface KDSOrderCardProps {
  order: KDSOrder;
  onItemStatusChange: (itemId: string, status: OrderItemStatus) => void;
}

const nextItemStatus: Partial<Record<OrderItemStatus, OrderItemStatus>> = {
  PENDING: "COOKING",
  COOKING: "READY",
};

export default function KDSOrderCard({ order, onItemStatusChange }: KDSOrderCardProps) {
  const elapsed = order.elapsed_minutes;
  let borderColor = "border-green-400";
  let headerBg = "bg-green-50";
  if (elapsed > 20) {
    borderColor = "border-red-400";
    headerBg = "bg-red-50";
  } else if (elapsed > 10) {
    borderColor = "border-amber-400";
    headerBg = "bg-amber-50";
  }

  return (
    <div className={cn("rounded-xl border-2 overflow-hidden shadow-sm", borderColor)}>
      <div className={cn("px-4 py-3 flex items-center justify-between", headerBg)}>
        <div>
          <span className="font-bold text-gray-900 text-lg">{order.order_number}</span>
          <span className="text-sm text-gray-600 ml-2">
            {order.order_type === "DINE_IN"
              ? `席 #${order.seat_number}`
              : `テイクアウト - ${order.customer_name}`}
          </span>
        </div>
        <div className="text-right">
          <span
            className={cn(
              "text-sm font-bold",
              elapsed > 20 ? "text-red-600" : elapsed > 10 ? "text-amber-600" : "text-green-600"
            )}
          >
            {elapsed}分
          </span>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {order.items.map((item) => {
          const canAdvance = nextItemStatus[item.status];
          return (
            <button
              key={item.id}
              onClick={() => {
                if (canAdvance) onItemStatusChange(item.id, canAdvance);
              }}
              disabled={!canAdvance}
              className={cn(
                "w-full text-left flex items-center justify-between p-3 rounded-lg border transition-all min-h-[56px]",
                canAdvance
                  ? "hover:shadow-md cursor-pointer active:scale-[0.98]"
                  : "cursor-default",
                item.status === "PENDING" && "bg-gray-50 border-gray-200",
                item.status === "COOKING" && "bg-amber-50 border-amber-200",
                item.status === "READY" && "bg-green-50 border-green-200"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-700 w-8">{item.quantity}x</span>
                <div>
                  <p className="font-semibold text-gray-900">{item.menu_item_name}</p>
                  {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                </div>
              </div>
              <StatusBadge status={item.status} type="item" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
