"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import PaymentForm from "@/components/billing/PaymentForm";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { formatCurrency, formatElapsedTime, getElapsedMinutes } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useSeatStore } from "@/stores/seatStore";
import { toast, withToast } from "@/stores/toastStore";
import {
  computeTotals,
  DiscountInput,
  OrderResponse,
  PaymentLineInput,
  PricedItem,
  SeatResponse,
} from "@/types";

interface PendingPayment {
  lines: PaymentLineInput[];
  discount?: DiscountInput;
  receipt_issued: boolean;
}

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const seatId = params.id as string;
  const { isAuthenticated } = useAuthStore();
  const applySeat = useSeatStore((s) => s.applySeat);
  const [seat, setSeat] = useState<SeatResponse | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingPayment | null>(null);

  const load = useCallback(async () => {
    const data = await withToast(() => api.getSeat(seatId));
    if (data) {
      setSeat(data);
      if (data.current_session) {
        const sessionOrders = await withToast(() =>
          api.getSessionOrders(data.current_session!.id)
        );
        if (sessionOrders) setOrders(sessionOrders.filter((o) => o.status === "OPEN"));
      }
      // 会計画面を開いたら席を会計中に(注文追加を止める)
      if (data.status === "GUIDED" || data.status === "ORDERING") {
        const updated = await api.changeSeatStatus(seatId, "BILLING").catch(() => null);
        if (updated) {
          setSeat(updated);
          applySeat(updated);
        }
      }
    }
    setLoading(false);
  }, [seatId, applySeat]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const items: PricedItem[] = useMemo(
    () =>
      orders.flatMap((o) =>
        o.items.map((i) => ({
          unit_price: i.unit_price,
          quantity: i.quantity,
          tax_rate: i.tax_rate,
          status: i.status,
        }))
      ),
    [orders]
  );

  const baseTotals = useMemo(() => computeTotals(items), [items]);

  const confirmPayment = async () => {
    if (!pending || !seat?.current_session) return;
    setSubmitting(true);
    const payment = await withToast(() =>
      api.createPayment({
        session_id: seat.current_session!.id,
        lines: pending.lines,
        discount: pending.discount,
        receipt_issued: pending.receipt_issued,
      })
    );
    setSubmitting(false);
    setPending(null);
    if (payment) {
      toast.success(
        payment.change_amount > 0
          ? `会計完了。おつり ${formatCurrency(payment.change_amount)} をお渡しください`
          : "会計が完了しました"
      );
      router.push("/");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!seat?.current_session || orders.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">会計対象の注文がありません</p>
        <Button onClick={() => router.push(`/seats/${seatId}`)} className="mt-4">
          席詳細に戻る
        </Button>
      </div>
    );
  }

  const session = seat.current_session;
  const cancelledExcluded = orders.flatMap((o) =>
    o.items.filter((i) => i.status !== "CANCELLED")
  );

  return (
    <div>
      <Header
        title={`会計 — 席 #${seat.seat_number}`}
        subtitle={`${session.party_size}名・${formatElapsedTime(getElapsedMinutes(session.seated_at))}`}
        actions={
          <Button variant="ghost" onClick={() => router.push(`/seats/${seatId}`)}>
            ← 席詳細に戻る
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_1.4fr]">
        <div className="h-fit rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            ご注文内容（{orders.length}件・{cancelledExcluded.length}品）
          </h3>
          <div className="max-h-[360px] overflow-y-auto">
            {cancelledExcluded.map((item) => (
              <div key={item.id} className="flex justify-between py-1.5 text-[13px] text-gray-600">
                <span>
                  {item.item_name} ×{item.quantity}
                </span>
                <span>{formatCurrency(item.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-[13px] text-gray-600">
            <div className="flex justify-between">
              <span>小計（税抜）</span>
              <span>{formatCurrency(baseTotals.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>消費税</span>
              <span>{formatCurrency(baseTotals.tax_amount)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t-2 border-gray-900 pt-2 text-xl font-extrabold text-gray-900">
              <span>合計</span>
              <span>{formatCurrency(baseTotals.total_amount)}</span>
            </div>
            <p className="pt-1 text-[11px] text-gray-400">
              ※ 値引きを入力すると右側の請求額に反映されます
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <PaymentForm items={items} onSubmit={setPending} loading={submitting} />
        </div>
      </div>

      <Modal isOpen={!!pending} onClose={() => setPending(null)} title="会計内容の確認">
        {pending && (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 text-sm">
              {pending.lines.map((l, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span className="text-gray-600">
                    {l.method === "CASH" ? "現金" : l.method === "CREDIT_CARD" ? "クレジットカード" : "QR決済"}
                    {l.received_amount != null && l.received_amount > l.amount && (
                      <span className="ml-1 text-xs text-gray-400">
                        （預かり {formatCurrency(l.received_amount)}）
                      </span>
                    )}
                  </span>
                  <b>{formatCurrency(l.amount)}</b>
                </div>
              ))}
              {pending.discount && (
                <div className="flex justify-between py-1 text-red-600">
                  <span>値引き</span>
                  <span>
                    {pending.discount.type === "FIXED"
                      ? `-${formatCurrency(pending.discount.value)}`
                      : `-${pending.discount.value}%`}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">
              会計を確定すると取り消しできません。よろしいですか？
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setPending(null)} className="flex-1">
                戻る
              </Button>
              <Button
                onClick={confirmPayment}
                disabled={submitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
              >
                {submitting ? "処理中..." : "確定する"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
