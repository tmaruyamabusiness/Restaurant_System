"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import KDSOrderCard from "@/components/kds/KDSOrderCard";
import { api } from "@/lib/api";
import { onSocketEvent } from "@/lib/socket";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useOrderStore } from "@/stores/orderStore";
import { toast, withToast } from "@/stores/toastStore";
import { OrderItemStatus, OrderResponse } from "@/types";

function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch {
    // 音が出せない環境では無視
  }
}

export default function KDSPage() {
  const { isAuthenticated } = useAuthStore();
  const { kdsOrders, loading, fetchKdsOrders } = useOrderStore();
  const [soundOn, setSoundOn] = useState(true);
  const [, forceTick] = useState(0);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    if (!isAuthenticated) return;
    withToast(() => fetchKdsOrders());
    // WebSocket が主。ポーリングは保険(60秒)、経過分の表示更新は30秒ごと
    const poll = setInterval(() => fetchKdsOrders().catch(() => undefined), 60000);
    const tick = setInterval(() => forceTick((n) => n + 1), 30000);
    const offNewOrder = onSocketEvent("new_order", ({ order }) => {
      if (soundRef.current) beep();
      toast.info(
        order.order_type === "TAKEOUT"
          ? `🔔 新規テイクアウト — ${order.customer_name ?? ""}（${order.items.length}品）`
          : `🔔 新規注文 — 席 #${order.seat_number}（${order.items.length}品）`
      );
    });
    return () => {
      clearInterval(poll);
      clearInterval(tick);
      offNewOrder();
    };
  }, [isAuthenticated, fetchKdsOrders]);

  const handleItemStatusChange = async (itemId: string, status: OrderItemStatus) => {
    await withToast(() => api.updateKdsItemStatus(itemId, status));
  };

  const handleCompleteAll = async (order: OrderResponse) => {
    for (const item of order.items) {
      if (item.status === "PENDING" || item.status === "COOKING") {
        const ok = await withToast(() => api.updateKdsItemStatus(item.id, "SERVED"));
        if (!ok) return;
      }
    }
    toast.success(`注文 #${order.order_number} をすべて完了にしました`);
  };

  const active = [...kdsOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="-m-6 min-h-screen bg-slate-950 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">👨‍🍳 キッチンディスプレイ</h1>
          <p className="text-[13px] text-slate-500">
            調理中の注文 {active.length}件 ・ リアルタイム更新
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSoundOn((v) => !v)}
            className={cn(
              "min-h-[44px] rounded-lg border px-4 text-[13px]",
              soundOn
                ? "border-slate-600 bg-slate-800 text-slate-200"
                : "border-slate-800 bg-slate-900 text-slate-500"
            )}
          >
            {soundOn ? "🔔 音 ON" : "🔕 音 OFF"}
          </button>
          <button
            onClick={() => document.documentElement.requestFullscreen?.().catch(() => undefined)}
            className="min-h-[44px] rounded-lg border border-slate-600 bg-slate-800 px-4 text-[13px] text-slate-200"
          >
            ⛶ 全画面
          </button>
        </div>
      </div>

      {loading && active.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-500" />
        </div>
      ) : active.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-2xl font-bold text-slate-500">全て完了！</p>
          <p className="mt-1 text-sm text-slate-600">未処理の注文はありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {active.map((order) => (
            <KDSOrderCard
              key={order.id}
              order={order}
              onItemStatusChange={handleItemStatusChange}
              onCompleteAll={handleCompleteAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}
