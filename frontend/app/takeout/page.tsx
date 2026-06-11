"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import PaymentForm from "@/components/billing/PaymentForm";
import TakeoutCard from "@/components/takeout/TakeoutCard";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useTakeoutStore } from "@/stores/takeoutStore";
import { toast, withToast } from "@/stores/toastStore";
import { PricedItem, TakeoutResponse, TakeoutStatus } from "@/types";

type Tab = "ACTIVE" | "DONE";

export default function TakeoutPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { orders, loading, fetchOrders, applyTakeout } = useTakeoutStore();
  const [tab, setTab] = useState<Tab>("ACTIVE");
  const [payTarget, setPayTarget] = useState<TakeoutResponse | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    withToast(() => fetchOrders());
    const interval = setInterval(() => fetchOrders().catch(() => undefined), 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchOrders]);

  const handleChangeStatus = async (takeout: TakeoutResponse, status: TakeoutStatus) => {
    const updated = await withToast(() => api.changeTakeoutStatus(takeout.id, status));
    if (updated) {
      applyTakeout(updated);
      if (status === "PICKED_UP") toast.success(`${takeout.customer_name} 様に受け渡しました`);
    }
  };

  const payItems: PricedItem[] = useMemo(
    () =>
      (payTarget?.orders ?? [])
        .filter((o) => o.status === "OPEN")
        .flatMap((o) =>
          o.items.map((i) => ({
            unit_price: i.unit_price,
            quantity: i.quantity,
            tax_rate: i.tax_rate,
            status: i.status,
          }))
        ),
    [payTarget]
  );

  const visible = useMemo(() => {
    const list = orders.filter((o) =>
      tab === "ACTIVE"
        ? o.status === "RECEIVED" || o.status === "PREPARING" || o.status === "READY"
        : o.status === "PICKED_UP" || o.status === "CANCELLED"
    );
    return [...list].sort(
      (a, b) => new Date(a.pickup_at).getTime() - new Date(b.pickup_at).getTime()
    );
  }, [orders, tab]);

  const activeCount = orders.filter(
    (o) => o.status === "RECEIVED" || o.status === "PREPARING" || o.status === "READY"
  ).length;

  return (
    <div>
      <Header
        title="テイクアウト管理"
        subtitle={`進行中 ${activeCount}件`}
        actions={<Button onClick={() => router.push("/takeout/new")}>+ 新規注文</Button>}
      />

      <div className="mb-4 flex gap-2">
        {(
          [
            { key: "ACTIVE", label: `進行中 ${activeCount}` },
            { key: "DONE", label: "受渡済・キャンセル" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-[40px] rounded-full border px-4 text-[13px]",
              tab === t.key
                ? "border-slate-900 bg-slate-900 font-bold text-white"
                : "border-gray-300 bg-white text-gray-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && orders.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-gray-400">該当する注文はありません</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => (
            <TakeoutCard
              key={t.id}
              takeout={t}
              onChangeStatus={handleChangeStatus}
              onPay={setPayTarget}
            />
          ))}
        </div>
      )}

      <Modal
        isOpen={!!payTarget}
        onClose={() => setPayTarget(null)}
        title={`会計 — ${payTarget?.customer_name ?? ""} 様`}
        className="max-w-xl"
      >
        {payTarget && (
          <PaymentForm
            items={payItems}
            loading={paying}
            onSubmit={async (data) => {
              const openOrder = payTarget.orders.find((o) => o.status === "OPEN");
              if (!openOrder) return;
              setPaying(true);
              const payment = await withToast(() =>
                api.createPayment({
                  order_id: openOrder.id,
                  lines: data.lines,
                  discount: data.discount,
                  receipt_issued: data.receipt_issued,
                })
              );
              if (payment) {
                const updated = await withToast(() =>
                  api.changeTakeoutStatus(payTarget.id, "PICKED_UP")
                );
                if (updated) applyTakeout(updated);
                toast.success("会計が完了し、受け渡し済みにしました");
                setPayTarget(null);
              }
              setPaying(false);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
