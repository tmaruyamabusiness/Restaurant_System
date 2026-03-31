"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useSeatStore } from "@/stores/seatStore";
import { useOrderStore } from "@/stores/orderStore";
import { Seat, SeatStatus } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, formatElapsedTime, getElapsedMinutes, getSeatTypeLabel, cn } from "@/lib/utils";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import OrderList from "@/components/order/OrderList";
import MenuSelector from "@/components/order/MenuSelector";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";

export default function SeatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seatId = params.id as string;
  const { token } = useAuthStore();
  const { updateSeat: updateSeatInStore } = useSeatStore();
  const { orders, fetchOrders } = useOrderStore();
  const [seat, setSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<SeatStatus>("ORDERING");

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const seatData = await api.getSeat(seatId, token);
        setSeat(seatData);
        if (seatData.current_session) {
          await fetchOrders(seatData.current_session.id, token);
        }
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [seatId, token, fetchOrders]);

  const handleAddOrder = async (items: { menu_item_id: string; quantity: number; notes?: string }[]) => {
    if (!token || !seat?.current_session) return;
    setOrderLoading(true);
    try {
      await api.createOrder(
        {
          order_type: "DINE_IN",
          seat_session_id: seat.current_session.id,
          items,
        },
        token
      );
      const updated = await api.getSeat(seatId, token);
      setSeat(updated);
      if (updated.current_session) {
        await fetchOrders(updated.current_session.id, token);
      }
      setShowMenu(false);
    } catch {
      // handle error
    } finally {
      setOrderLoading(false);
    }
  };

  const handleItemStatusChange = async (itemId: string, status: string) => {
    if (!token) return;
    try {
      await api.updateOrderItemStatus(itemId, status, token);
      if (seat?.current_session) {
        await fetchOrders(seat.current_session.id, token);
      }
    } catch {
      // handle error
    }
  };

  const handleStatusChange = async () => {
    if (!token || !seat) return;
    try {
      const updated = await api.updateSeatStatus(seat.id, newStatus, undefined, token);
      setSeat(updated);
      updateSeatInStore(updated);
      setShowStatusModal(false);
      if (newStatus === "VACANT") {
        router.push("/");
      }
    } catch {
      // handle error
    }
  };

  const sessionOrders = seat?.current_session?.orders || orders;
  const orderTotal = sessionOrders.reduce((sum, o) => sum + o.total, 0);
  const elapsed = seat?.current_session ? getElapsedMinutes(seat.current_session.seated_at) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!seat) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">席が見つかりません</p>
        <Button onClick={() => router.push("/")} className="mt-4">
          フロアマップに戻る
        </Button>
      </div>
    );
  }

  const statusOptions: { value: string; label: string }[] = [
    { value: "VACANT", label: "空席" },
    { value: "GUIDED", label: "案内済" },
    { value: "ORDERING", label: "注文中" },
    { value: "BILLING", label: "会計中" },
    { value: "CLEANING", label: "清掃中" },
  ];

  return (
    <div>
      <Header
        title={`席 #${seat.number}`}
        subtitle={getSeatTypeLabel(seat.type)}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => router.push("/")}>
              フロアに戻る
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">席情報</h3>
              <StatusBadge status={seat.status} type="seat" />
            </div>

            {seat.current_session && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">人数</p>
                    <p className="font-semibold text-gray-900">{seat.current_session.party_size} 名</p>
                  </div>
                  <div>
                    <p className="text-gray-500">経過時間</p>
                    <p className={cn("font-semibold", elapsed >= 60 ? "text-red-600" : "text-gray-900")}>
                      {formatElapsedTime(elapsed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">注文数</p>
                    <p className="font-semibold text-gray-900">{sessionOrders.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">合計</p>
                    <p className="font-bold text-lg text-gray-900">{formatCurrency(orderTotal)}</p>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatusModal(true)}
                className="flex-1"
              >
                ステータス変更
              </Button>
              {seat.status !== "VACANT" && seat.status !== "BILLING" && (
                <Button
                  size="sm"
                  onClick={() => router.push(`/seats/${seat.id}/billing`)}
                  className="flex-1"
                >
                  会計へ
                </Button>
              )}
            </div>
          </div>

          {seat.status !== "VACANT" && (
            <Button onClick={() => setShowMenu(true)} className="w-full" size="lg">
              + 新規注文
            </Button>
          )}
        </div>

        <div className="lg:col-span-2">
          {showMenu ? (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">メニューから選択</h3>
              <MenuSelector
                onSubmit={handleAddOrder}
                onCancel={() => setShowMenu(false)}
                loading={orderLoading}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">注文一覧</h3>
              <OrderList
                orders={sessionOrders}
                onItemStatusChange={handleItemStatusChange}
                showStatusControls
              />
              {sessionOrders.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-600 font-medium">小計</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(orderTotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showStatusModal} onClose={() => setShowStatusModal(false)} title="席のステータス変更">
        <div className="space-y-4">
          <Select
            id="status"
            label="新しいステータス"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as SeatStatus)}
            options={statusOptions}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowStatusModal(false)} className="flex-1">
              キャンセル
            </Button>
            <Button onClick={handleStatusChange} className="flex-1">
              更新
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
