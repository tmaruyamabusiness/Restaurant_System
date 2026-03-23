"use client";

import { Order } from "@/types";
import { formatCurrency, formatTime } from "@/lib/utils";
import OrderItemCard from "./OrderItemCard";

interface OrderListProps {
  orders: Order[];
  onItemStatusChange?: (itemId: string, status: string) => void;
  showStatusControls?: boolean;
}

export default function OrderList({ orders, onItemStatusChange, showStatusControls }: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">No orders yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm text-gray-900">
                {order.order_number}
              </span>
              <span className="text-xs text-gray-500">{formatTime(order.created_at)}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {formatCurrency(order.total)}
            </span>
          </div>
          <div className="p-2 space-y-1">
            {order.items.map((item) => (
              <OrderItemCard
                key={item.id}
                item={item}
                onStatusChange={onItemStatusChange}
                showStatusControls={showStatusControls}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
