"use client";

import { Seat } from "@/types";
import {
  getSeatStatusColor,
  getSeatStatusBorder,
  getSeatTypeIcon,
  getSeatTypeLabel,
  getElapsedMinutes,
  formatElapsedTime,
  cn,
} from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";

interface SeatCardProps {
  seat: Seat;
  alertThreshold: number;
  onClick: () => void;
}

export default function SeatCard({ seat, alertThreshold, onClick }: SeatCardProps) {
  const elapsed = seat.current_session
    ? getElapsedMinutes(seat.current_session.seated_at)
    : 0;
  const isLongStay = seat.status !== "VACANT" && elapsed >= alertThreshold;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg min-h-[140px] flex flex-col",
        getSeatStatusBorder(seat.status),
        isLongStay && "border-red-500 ring-2 ring-red-300"
      )}
    >
      {isLongStay && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse">
          {formatElapsedTime(elapsed)}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getSeatTypeIcon(seat.type)}</span>
          <span className="font-bold text-gray-900 text-lg">#{seat.number}</span>
        </div>
        <StatusBadge status={seat.status} type="seat" />
      </div>

      <p className="text-xs text-gray-500 mb-2">{getSeatTypeLabel(seat.type)}</p>

      <div className="mt-auto">
        {seat.status !== "VACANT" && seat.current_session ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">人数</span>
              <span className="font-semibold">{seat.current_session.party_size}名</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">経過</span>
              <span className={cn("font-semibold", isLongStay ? "text-red-600" : "text-gray-900")}>
                {formatElapsedTime(elapsed)}
              </span>
            </div>
            {seat.current_session.orders && seat.current_session.orders.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">注文</span>
                <span className="font-semibold">{seat.current_session.orders.length}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">空席</p>
        )}
      </div>
    </div>
  );
}
