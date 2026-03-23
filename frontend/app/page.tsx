"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useSeatStore } from "@/stores/seatStore";
import { Seat, SeatStatus } from "@/types";
import Header from "@/components/layout/Header";
import SeatCard from "@/components/floor/SeatCard";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";

export default function FloorMapPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { seats, loading, alertThreshold, fetchSeats, updateSeat } = useSeatStore();
  const [guideModal, setGuideModal] = useState<Seat | null>(null);
  const [partySize, setPartySize] = useState(1);

  useEffect(() => {
    if (token) {
      fetchSeats(token);
      const interval = setInterval(() => fetchSeats(token), 30000);
      return () => clearInterval(interval);
    }
  }, [token, fetchSeats]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === "VACANT") {
      setGuideModal(seat);
      setPartySize(1);
    } else {
      router.push(`/seats/${seat.id}`);
    }
  };

  const handleGuide = async () => {
    if (!guideModal || !token) return;
    try {
      const updated = await api.updateSeatStatus(guideModal.id, "GUIDED", partySize, token);
      updateSeat(updated);
      setGuideModal(null);
      router.push(`/seats/${guideModal.id}`);
    } catch {
      // error handling
    }
  };

  const statusCounts = seats.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statuses: { key: SeatStatus; label: string; color: string }[] = [
    { key: "VACANT", label: "Vacant", color: "bg-gray-200" },
    { key: "GUIDED", label: "Guided", color: "bg-blue-200" },
    { key: "ORDERING", label: "Ordering", color: "bg-amber-200" },
    { key: "BILLING", label: "Billing", color: "bg-orange-200" },
    { key: "CLEANING", label: "Cleaning", color: "bg-green-200" },
  ];

  return (
    <div>
      <Header
        title="Floor Map"
        subtitle={`${seats.length} seats | ${statusCounts["VACANT"] || 0} available`}
        actions={
          <Button onClick={() => router.push("/takeout/new")}>
            + New Takeout
          </Button>
        }
      />

      <div className="flex gap-3 mb-6 flex-wrap">
        {statuses.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <div className={`w-3 h-3 rounded-full ${s.color}`} />
            <span className="text-gray-600">{s.label}</span>
            <span className="font-semibold text-gray-900">{statusCounts[s.key] || 0}</span>
          </div>
        ))}
      </div>

      {loading && seats.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {seats
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((seat) => (
              <SeatCard
                key={seat.id}
                seat={seat}
                alertThreshold={alertThreshold}
                onClick={() => handleSeatClick(seat)}
              />
            ))}
        </div>
      )}

      <Modal isOpen={!!guideModal} onClose={() => setGuideModal(null)} title="Guide to Seat">
        {guideModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Seat #{guideModal.number} ({guideModal.type.replace(/_/g, " ")}) - Capacity: {guideModal.capacity}
            </p>
            <Input
              id="partySize"
              label="Party Size"
              type="number"
              min={1}
              max={guideModal.capacity}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setGuideModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleGuide} className="flex-1">
                Guide
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
