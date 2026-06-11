"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/layout/Header";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import { cn, formatCurrency, formatDateInput, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import { DailyReportResponse, MonthlyReportResponse } from "@/types";

type Mode = "daily" | "monthly";

export default function ReportsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [mode, setMode] = useState<Mode>("daily");
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [month, setMonth] = useState(formatDateInput(new Date()).slice(0, 7));
  const [daily, setDaily] = useState<DailyReportResponse | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  // 古いレスポンスが新しい結果を上書きしないようにリクエストに連番を付ける
  const requestSeq = useRef(0);

  const canView = user?.role === "OWNER" || user?.role === "MANAGER";

  useEffect(() => {
    if (!isAuthenticated || !canView) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    (async () => {
      try {
        if (mode === "daily") {
          const report = await api.getDailyReport(date);
          if (seq === requestSeq.current) setDaily(report);
        } else {
          const [y, m] = month.split("-").map(Number);
          const report = await api.getMonthlyReport(y, m);
          if (seq === requestSeq.current) setMonthly(report);
        }
      } catch (e) {
        if (seq === requestSeq.current) {
          toast.error(e instanceof Error ? e.message : "レポートの取得に失敗しました");
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    })();
  }, [isAuthenticated, canView, mode, date, month]);

  if (!canView) {
    return (
      <div className="py-20 text-center text-gray-500">
        売上レポートはオーナー・マネージャーのみ閲覧できます
      </div>
    );
  }

  const maxHour = Math.max(1, ...(daily?.by_hour.map((h) => h.amount) ?? [1]));
  const maxDay = Math.max(1, ...(monthly?.by_day.map((d) => d.amount) ?? [1]));

  return (
    <div>
      <Header
        title="売上レポート"
        subtitle="営業日は日本時間0時区切りで集計します"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-gray-300">
              {(["daily", "monthly"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "min-h-[44px] px-4 text-sm",
                    mode === m ? "bg-slate-900 font-bold text-white" : "bg-white text-gray-600"
                  )}
                >
                  {m === "daily" ? "日次" : "月次"}
                </button>
              ))}
            </div>
            {mode === "daily" ? (
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
            ) : (
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />
            )}
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : mode === "daily" && daily ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "売上（税込・値引後）", value: formatCurrency(daily.net_sales), big: true },
              { label: "注文数", value: `${daily.order_count}件` },
              { label: "来店人数", value: `${daily.guest_count}名` },
              { label: "値引き合計", value: `-${formatCurrency(daily.discount_total)}` },
            ].map((kv) => (
              <div key={kv.label} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">{kv.label}</p>
                <p className={cn("font-extrabold text-gray-900", kv.big ? "text-2xl" : "text-xl")}>
                  {kv.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">時間帯別売上（日本時間）</h3>
              {daily.by_hour.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">データがありません</p>
              ) : (
                <div className="space-y-1.5">
                  {daily.by_hour.map((h) => (
                    <div key={h.hour} className="flex items-center gap-2 text-xs">
                      <span className="w-10 text-gray-500">{h.hour}時</span>
                      <div className="h-5 flex-1 rounded bg-gray-50">
                        <div
                          className="h-5 rounded bg-blue-500"
                          style={{ width: `${(h.amount / maxHour) * 100}%` }}
                        />
                      </div>
                      <span className="w-20 text-right font-semibold text-gray-700">
                        {formatCurrency(h.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">支払方法別</h3>
                {daily.by_payment_method.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">データがありません</p>
                ) : (
                  daily.by_payment_method.map((m) => (
                    <div key={m.method} className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-600">
                        {getStatusLabel(m.method)}（{m.count}件）
                      </span>
                      <b>{formatCurrency(m.amount)}</b>
                    </div>
                  ))
                )}
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">人気商品 TOP10</h3>
                {daily.top_items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">データがありません</p>
                ) : (
                  daily.top_items.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2 py-1.5 text-sm">
                      <span className="w-6 font-bold text-gray-400">{i + 1}</span>
                      <span className="flex-1 text-gray-700">{item.name}</span>
                      <span className="text-xs text-gray-400">×{item.quantity}</span>
                      <b className="w-20 text-right">{formatCurrency(item.amount)}</b>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : mode === "monthly" && monthly ? (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {[
              { label: "月間売上（税込・値引後）", value: formatCurrency(monthly.net_sales) },
              { label: "総売上（値引前）", value: formatCurrency(monthly.gross_sales) },
              { label: "注文数", value: `${monthly.order_count}件` },
            ].map((kv) => (
              <div key={kv.label} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-xs text-gray-500">{kv.label}</p>
                <p className="text-2xl font-extrabold text-gray-900">{kv.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">日別売上</h3>
            {monthly.by_day.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">データがありません</p>
            ) : (
              <div className="space-y-1.5">
                {monthly.by_day.map((d) => (
                  <div key={d.date} className="flex items-center gap-2 text-xs">
                    <span className="w-20 text-gray-500">{d.date.slice(5)}</span>
                    <div className="h-5 flex-1 rounded bg-gray-50">
                      <div
                        className="h-5 rounded bg-emerald-500"
                        style={{ width: `${(d.amount / maxDay) * 100}%` }}
                      />
                    </div>
                    <span className="w-24 text-right font-semibold text-gray-700">
                      {formatCurrency(d.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
