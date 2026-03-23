"use client";

import { OrderItem } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";

interface OrderItemCardProps {
  item: OrderItem;
  onStatusChange?: (itemId: string, status: string) => void;
  showStatusControls?: boolean;
}

export default function OrderItemCard({ item, onStatusChange, showStatusControls }: OrderItemCardProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 border border-gray-100">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm truncate">{item.menu_item_name}</span>
          <span className="text-gray-500 text-sm">x{item.quantity}</span>
        </div>
        {item.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>}
        <p className="text-sm text-gray-600 mt-0.5">{formatCurrency(item.subtotal)}</p>
      </div>
      <div className="flex items-center gap-2 ml-2">
        <StatusBadge status={item.status} type="item" />
        {showStatusControls && item.status !== "SERVED" && item.status !== "CANCELLED" && (
          <button
            onClick={() => {
              if (!onStatusChange) return;
              const nextStatus: Record<string, string> = {
                PENDING: "COOKING",
                COOKING: "READY",
                READY: "SERVED",
              };
              const next = nextStatus[item.status];
              if (next) onStatusChange(item.id, next);
            }}
            className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors min-h-[32px]"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
