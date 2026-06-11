"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import MenuSelector from "@/components/order/MenuSelector";
import OrderList from "@/components/order/OrderList";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { api } from "@/lib/api";
import {
  cn,
  formatCurrency,
  formatElapsedTime,
  getElapsedMinutes,
  getSeatTypeLabel,
} from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useOrderStore } from "@/stores/orderStore";
import { useSeatStore } from "@/stores/seatStore";
import { withToast } from "@/stores/toastStore";
import { OrderItemCreate, OrderItemStatus, SeatResponse } from "@/types";

const STEPS = [
  { key: "GUIDED", label: "案内" },
  { key: "ORDERING", label: "注文中" },
  { key: "BILLING", label: "会計" },
  { key: "CLEANING", label: "清掃" },
] as const;

function Stepper({ status }: { status: string }) {
  const currentIdx = STEPS.findIndex((s) => s.key === status);
  return (
    <div className="mb-4 flex items-center">
      {STEPS.map((step, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "now" : "todo";
        return (
          <div key={step.key} className="flex items-center">
            {i > 0 && <div className="mx-1.5 h-0.5 w-8 bg-gray-200" />}
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs",
                state === "now" && "font-bold text-blue-700",
                state === "done" && "text-emerald-700",
                state === "todo" && "text-gray-400"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  state === "now" && "bg-blue-600 text-white",
                  state === "done" && "bg-emerald-500 text-white",
                  state === "todo" && "bg-gray-200 text-gray-500"
                )}
              >
                {state === "done" ? "✓" : i + 1}
              </span>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SeatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seatId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const applySeat = useSeatStore((s) => s.applySeat);
  const { sessionOrders, fetchSessionOrders, clearSessionOrders } = useOrderStore();
  const [seat, setSeat] = useState<SeatResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    const data = await withToast(() => api.getSeat(seatId));
    if (data) {
      setSeat(data);
      applySeat(data);
      if (data.current_session) await fetchSessionOrders(data.current_session.id);
      else clearSessionOrders();
    }
    setLoading(false);
  }, [seatId, applySeat, fetchSessionOrders, clearSessionOrders]);

  useEffect(() => {
    if (isAuthenticated) reload();
  }, [isAuthenticated, reload]);

  const handleAddOrder = async (items: OrderItemCreate[]) => {
    if (!seat?.current_session) return;
    setSubmitting(true);
    const created = await withToast(
      () =>
        api.createOrder({
          order_type: "DINE_IN",
          session_id: seat.current_session!.id,
          items,
        }),
      "注文をキッチンに送信しました"
    );
    setSubmitting(false);
    if (created) {
      setShowMenu(false);
      await reload();
    }
  };

  const handleItemStatusChange = async (
    orderId: string,
    itemId: string,
    status: OrderItemStatus
  ) => {
    const updated = await withToast(() => api.updateOrderItem(orderId, itemId, { status }));
    if (updated) await fetchSessionOrders(seat!.current_session!.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!seat) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">席が見つかりません</p>
        <Button onClick={() => router.push("/")} className="mt-4">
          フロアマップに戻る
        </Button>
      </div>
    );
  }

  const session = seat.current_session;
  const activeOrders = sessionOrders.filter((o) => o.status !== "CANCELLED");
  const orderTotal = activeOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const elapsed = session ? getElapsedMinutes(session.seated_at) : 0;

  return (
    <div>
      <Header
        title={`席 #${seat.seat_number}`}
        subtitle={`${getSeatTypeLabel(seat.seat_type)}・${seat.capacity}名席`}
        actions={
          <Button variant="ghost" onClick={() => router.push("/")}>
            ← フロアに戻る
          </Button>
        }
      />

      {!session ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <p className="text-gray-500">この席は現在空席です</p>
          <Button onClick={() => router.push("/")} className="mt-4">
            フロアマップで案内する
          </Button>
        </div>
      ) : (
        <>
          <Stepper status={seat.status} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
            <div className="space-y-4">
              <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">ご利用状況</h3>
                  <StatusBadge type="seat" status={seat.status} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "人数", value: `${session.party_size}名` },
                    {
                      label: "経過時間",
                      value: formatElapsedTime(elapsed),
                      alert: elapsed >= 60,
                    },
                    { label: "注文", value: `${activeOrders.length}件` },
                    { label: "合計（税込）", value: formatCurrency(orderTotal), big: true },
                  ].map((kv) => (
                    <div key={kv.label} className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[11px] text-gray-500">{kv.label}</p>
                      <p
                        className={cn(
                          "font-bold text-gray-900",
                          kv.big ? "text-lg" : "text-base",
                          kv.alert && "text-red-600"
                        )}
                      >
                        {kv.value}
                      </p>
                    </div>
                  ))}
                </div>

                {(seat.status === "GUIDED" || seat.status === "ORDERING") && (
                  <>
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                      disabled={activeOrders.length === 0}
                      onClick={() => router.push(`/seats/${seat.id}/billing`)}
                    >
                      💴 会計へ進む
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => setShowMenu(true)}
                    >
                      + 注文を追加
                    </Button>
                  </>
                )}
                {seat.status === "BILLING" && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                    onClick={() => router.push(`/seats/${seat.id}/billing`)}
                  >
                    💴 会計画面を開く
                  </Button>
                )}
                {seat.status === "CLEANING" && (
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                    onClick={async () => {
                      const updated = await withToast(
                        () => api.changeSeatStatus(seat.id, "VACANT"),
                        "清掃完了。空席に戻しました"
                      );
                      if (updated) {
                        applySeat(updated);
                        router.push("/");
                      }
                    }}
                  >
                    ✓ 清掃完了（空席に戻す）
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              {showMenu ? (
                <>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">
                    注文入力 — 席 #{seat.seat_number}
                  </h3>
                  <MenuSelector
                    orderType="DINE_IN"
                    onSubmit={handleAddOrder}
                    onCancel={() => setShowMenu(false)}
                    loading={submitting}
                  />
                </>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">注文一覧</h3>
                    <span className="text-xs text-gray-400">最新が上に表示されます</span>
                  </div>
                  <OrderList orders={sessionOrders} onItemStatusChange={handleItemStatusChange} />
                  {activeOrders.length > 0 && (
                    <div className="mt-4 flex items-center justify-between border-t-2 border-gray-100 pt-3">
                      <span className="font-medium text-gray-600">合計（税込）</span>
                      <span className="text-2xl font-extrabold text-gray-900">
                        {formatCurrency(orderTotal)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
