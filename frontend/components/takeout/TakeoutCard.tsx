"use client";

import { TakeoutOrder, TakeoutStatus } from "@/types";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";

interface TakeoutCardProps {
  order: TakeoutOrder;
  expanded?: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: TakeoutStatus) => void;
}

const nextStatus: Partial<Record<TakeoutStatus, TakeoutStatus>> = {
  RECEIVED: "PREPARING",
  PREPARING: "READY",
  READY: "PICKED_UP",
};

export default function TakeoutCard({ order, expanded, onToggle, onStatusChange }: TakeoutCardProps) {
  const itemsSummary = order.orders
    .flatMap((o) => o.items)
    .map((i) => `${i.menu_item_name} x${i.quantity}`)
    .join(", ");

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900">{order.order_number}</span>
              <StatusBadge status={order.status} type="takeout" />
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  order.payment_status === "PAID"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                )}
              >
                {order.payment_status}
              </span>
            </div>
            <p className="text-sm text-gray-900 mt-1 font-medium">{order.customer_name}</p>
            <p className="text-xs text-gray-500">{order.customer_phone}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">{formatCurrency(order.total)}</p>
            <p className="text-xs text-gray-500 mt-1">Pickup: {formatDateTime(order.pickup_time)}</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 truncate">{itemsSummary}</p>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="space-y-2 mb-4">
            {order.orders.flatMap((o) =>
              o.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900">{item.menu_item_name}</span>
                    <span className="text-gray-500">x{item.quantity}</span>
                    <StatusBadge status={item.status} type="item" />
                  </div>
                  <span className="text-gray-900 font-medium">{formatCurrency(item.subtotal)}</span>
                </div>
              ))
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span>{formatCurrency(order.tax)}</span>
            </div>
            <div className="flex justify-between font-bold mt-1 pt-1 border-t border-gray-200">
              <span>Total</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>

          {nextStatus[order.status] && (
            <Button
              onClick={() => onStatusChange(order.id, nextStatus[order.status]!)}
              className="w-full"
            >
              Move to {nextStatus[order.status]!.replace(/_/g, " ")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
