"use client";

import { cn } from "@/lib/utils";
import {
  getSeatStatusColor,
  getItemStatusColor,
  getTakeoutStatusColor,
} from "@/lib/utils";
import { SeatStatus, OrderItemStatus, TakeoutStatus } from "@/types";

type StatusType = "seat" | "item" | "takeout";

interface StatusBadgeProps {
  status: string;
  type: StatusType;
  className?: string;
}

export default function StatusBadge({ status, type, className }: StatusBadgeProps) {
  let colorClass = "bg-gray-200 text-gray-700";

  if (type === "seat") {
    colorClass = getSeatStatusColor(status as SeatStatus);
  } else if (type === "item") {
    colorClass = getItemStatusColor(status as OrderItemStatus);
  } else if (type === "takeout") {
    colorClass = getTakeoutStatusColor(status as TakeoutStatus);
  }

  const displayLabel = (status ?? "").replace(/_/g, " ");

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
        colorClass,
        className
      )}
    >
      {displayLabel}
    </span>
  );
}
