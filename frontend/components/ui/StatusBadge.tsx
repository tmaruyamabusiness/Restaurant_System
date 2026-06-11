"use client";

import {
  cn,
  getItemStatusColor,
  getSeatStatusChip,
  getStatusLabel,
  getTakeoutStatusColor,
} from "@/lib/utils";
import { OrderItemStatus, SeatStatus, TakeoutStatus } from "@/types";

type Props =
  | { type: "seat"; status: SeatStatus; className?: string }
  | { type: "item"; status: OrderItemStatus; className?: string }
  | { type: "takeout"; status: TakeoutStatus; className?: string };

export default function StatusBadge({ type, status, className }: Props) {
  const colorClass =
    type === "seat"
      ? getSeatStatusChip(status)
      : type === "item"
        ? getItemStatusColor(status)
        : getTakeoutStatusColor(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        colorClass,
        className
      )}
    >
      {getStatusLabel(status)}
    </span>
  );
}
