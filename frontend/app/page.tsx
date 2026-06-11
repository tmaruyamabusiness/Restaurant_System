"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import SeatCard from "@/components/floor/SeatCard";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { cn, getSeatStatusChip, getSeatTypeLabel, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useSeatStore } from "@/stores/seatStore";
import { toast, withToast } from "@/stores/toastStore";
import { SeatResponse, SeatStatus, SeatType } from "@/types";

const STATUS_ORDER: SeatStatus[] = ["VACANT", "GUIDED", "ORDERING", "BILLING", "CLEANING"];
const TYPE_FILTERS: { key: SeatType | "ALL"; label: string }[] = [
  { key: "ALL", label: "すべて" },
  { key: "TABLE", label: "🪑 テーブル" },
  { key: "COUNTER", label: "🍶 カウンター" },
  { key: "PRIVATE", label: "🚪 個室" },
];

export default function FloorMapPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { seats, loading, alertThreshold, fetchSeats, fetchSettings, applySeat } = useSeatStore();
  const [guideTarget, setGuideTarget] = useState<SeatResponse | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [typeFilter, setTypeFilter] = useState<SeatType | "ALL">("ALL");

  useEffect(() => {
    if (!isAuthenticated) return;
    withToast(() => fetchSeats());
    withToast(() => fetchSettings());
    // WebSocket が主、ポーリングは保険
    const interval = setInterval(() => fetchSeats().catch(() => undefined), 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchSeats, fetchSettings]);

  const handleGuide = async () => {
    if (!guideTarget) return;
    const updated = await withToast(
      () => api.guideSeat(guideTarget.id, { party_size: partySize }),
      `席 #${guideTarget.seat_number} に ${partySize}名を案内しました`
    );
    if (updated) {
      applySeat(updated);
      setGuideTarget(null);
      router.push(`/seats/${updated.id}`);
    }
  };

  const handleCleanDone = async (seat: SeatResponse) => {
    const updated = await withToast(
      () => api.changeSeatStatus(seat.id, "VACANT"),
      `席 #${seat.seat_number} を空席に戻しました`
    );
    if (updated) applySeat(updated);
  };

  const statusCounts = useMemo(() => {
    const counts = {} as Record<SeatStatus, number>;
    for (const s of seats) counts[s.status] = (counts[s.status] ?? 0) + 1;
    return counts;
  }, [seats]);

  const visibleSeats = useMemo(
    () =>
      [...seats]
        .filter((s) => typeFilter === "ALL" || s.seat_type === typeFilter)
        .sort((a, b) => a.sort_order - b.sort_order),
    [seats, typeFilter]
  );

  return (
    <div>
      <Header
        title="フロアマップ"
        subtitle={`${seats.length}席 ・ 空席 ${statusCounts.VACANT ?? 0}`}
        actions={
          <Button onClick={() => router.push("/takeout/new")}>+ テイクアウト新規</Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_ORDER.map((status) => (
          <span
            key={status}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
              getSeatStatusChip(status)
            )}
          >
            {getStatusLabel(status)} {statusCounts[status] ?? 0}
          </span>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={cn(
              "min-h-[38px] rounded-full border px-4 py-1.5 text-[13px]",
              typeFilter === f.key
                ? "border-slate-900 bg-slate-900 font-semibold text-white"
                : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && seats.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visibleSeats.map((seat) => (
            <SeatCard
              key={seat.id}
              seat={seat}
              alertThreshold={alertThreshold}
              onOpen={() => router.push(`/seats/${seat.id}`)}
              onGuide={() => {
                setGuideTarget(seat);
                setPartySize(Math.min(2, seat.capacity));
              }}
              onCleanDone={() => handleCleanDone(seat)}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={!!guideTarget}
        onClose={() => setGuideTarget(null)}
        title="席への案内"
      >
        {guideTarget && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              席 #{guideTarget.seat_number}（{getSeatTypeLabel(guideTarget.seat_type)}）- 定員:{" "}
              {guideTarget.capacity}名
            </p>
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">人数</p>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: guideTarget.capacity }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPartySize(n)}
                    className={cn(
                      "min-h-[48px] rounded-lg border-2 text-base font-bold",
                      partySize === n
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    )}
                  >
                    {n}名
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setGuideTarget(null)} className="flex-1">
                キャンセル
              </Button>
              <Button onClick={handleGuide} className="flex-1">
                案内する
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
