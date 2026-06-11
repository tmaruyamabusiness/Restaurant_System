"use client";

import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatCurrency, formatTime, getStatusLabel } from "@/lib/utils";
import { OrderItemStatus, OrderResponse } from "@/types";

interface OrderListProps {
  orders: OrderResponse[];
  onItemStatusChange?: (orderId: string, itemId: string, status: OrderItemStatus) => void;
}

const NEXT_ACTION: Partial<Record<OrderItemStatus, { to: OrderItemStatus; label: string }>> = {
  PENDING: { to: "COOKING", label: "▶ 調理開始" },
  COOKING: { to: "SERVED", label: "✓ 提供" },
};

export default function OrderList({ orders, onItemStatusChange }: OrderListProps) {
  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-gray-400">まだ注文がありません</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id}>
          <p className="mb-1 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
            <span>
              注文 #{order.order_number} ・ {formatTime(order.created_at)}
              {order.status !== "OPEN" && (
                <span className="ml-2 font-semibold text-gray-400">
                  [{getStatusLabel(order.status)}]
                </span>
              )}
            </span>
            <b>{formatCurrency(order.total_amount)}</b>
          </p>
          {order.items.map((item) => {
            const action = NEXT_ACTION[item.status];
            return (
              <div
                key={item.id}
                className="flex items-center gap-2 border-b border-gray-50 px-1 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm text-gray-900",
                      item.status === "CANCELLED" && "text-gray-400 line-through"
                    )}
                  >
                    {item.item_name}
                  </p>
                  {item.notes && <p className="text-[11px] text-amber-600">備考: {item.notes}</p>}
                </div>
                <span className="text-[13px] text-gray-500">×{item.quantity}</span>
                <span className="w-16 text-right text-[13px] font-semibold text-gray-700">
                  {formatCurrency(item.unit_price * item.quantity)}
                </span>
                <StatusBadge type="item" status={item.status} />
                {onItemStatusChange && order.status === "OPEN" && action && (
                  <button
                    onClick={() => onItemStatusChange(order.id, item.id, action.to)}
                    className="min-h-[34px] whitespace-nowrap rounded-lg bg-gray-100 px-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    {action.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
