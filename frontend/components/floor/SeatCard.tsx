"use client";

import { SeatResponse } from "@/types";
import {
  cn,
  formatCurrency,
  formatElapsedTime,
  getElapsedMinutes,
  getSeatCardStyle,
  getSeatTypeIcon,
  getSeatTypeLabel,
} from "@/lib/utils";

interface SeatCardProps {
  seat: SeatResponse;
  alertThreshold: number;
  onOpen: () => void;
  onGuide: () => void;
  onCleanDone: () => void;
}

export default function SeatCard({
  seat,
  alertThreshold,
  onOpen,
  onGuide,
  onCleanDone,
}: SeatCardProps) {
  const session = seat.current_session;
  const elapsed = session ? getElapsedMinutes(session.seated_at) : 0;
  const isLongStay =
    seat.status !== "VACANT" && seat.status !== "CLEANING" && elapsed >= alertThreshold;
  const vacant = seat.status === "VACANT";

  return (
    <div
      onClick={vacant ? undefined : onOpen}
      className={cn(
        "relative flex min-h-[150px] cursor-pointer flex-col rounded-xl border-2 p-3.5 transition-all hover:shadow-lg",
        getSeatCardStyle(seat.status),
        isLongStay && "ring-[3px] ring-red-300"
      )}
    >
      {isLongStay && (
        <div className="absolute -right-2 -top-2 animate-pulse rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-extrabold text-white">
          ⏰ {formatElapsedTime(elapsed)}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-lg font-bold">
        <span>{getSeatTypeIcon(seat.seat_type)}</span>
        <span>#{seat.seat_number}</span>
      </div>
      <p className={cn("mb-2 text-[11px]", vacant ? "text-gray-400" : "opacity-75")}>
        {getSeatTypeLabel(seat.seat_type)}・{seat.capacity}名席
      </p>

      {session ? (
        <div className="space-y-0.5 text-xs">
          <div className="flex justify-between">
            <span className="opacity-80">人数</span>
            <b>{session.party_size}名</b>
          </div>
          <div className="flex justify-between">
            <span className="opacity-80">経過</span>
            <b>{formatElapsedTime(elapsed)}</b>
          </div>
          {session.open_order_count > 0 && (
            <div className="flex justify-between">
              <span className="opacity-80">注文 {session.open_order_count}件</span>
              <b>{formatCurrency(session.open_order_total)}</b>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs italic text-gray-400">空席</p>
      )}

      <div className="mt-auto pt-2">
        {vacant && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onGuide();
            }}
            className="min-h-[40px] w-full rounded-lg bg-blue-50 text-[13px] font-bold text-blue-700 hover:bg-blue-100"
          >
            👥 案内する
          </button>
        )}
        {seat.status === "CLEANING" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCleanDone();
            }}
            className="min-h-[40px] w-full rounded-lg bg-white text-[13px] font-bold text-emerald-700 hover:bg-emerald-50"
          >
            ✓ 清掃完了（空席に戻す）
          </button>
        )}
        {seat.status === "BILLING" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="min-h-[40px] w-full rounded-lg bg-white text-[13px] font-bold text-orange-700 hover:bg-orange-50"
          >
            💴 会計画面へ
          </button>
        )}
      </div>
    </div>
  );
}
