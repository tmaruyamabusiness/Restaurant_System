"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { SalesReport, MonthlySalesReport } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, formatDateInput, cn, getStatusLabel } from "@/lib/utils";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const paymentMethodLabels: Record<string, string> = {
  CASH: "現金",
  CREDIT_CARD: "クレジットカード",
  QR: "QR決済",
};

const orderTypeLabels: Record<string, string> = {
  DINE_IN: "店内飲食",
  TAKEOUT: "テイクアウト",
};

export default function ReportsPage() {
  const { token } = useAuthStore();
  const [view, setView] = useState<"daily" | "monthly">("daily");
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [month, setMonth] = useState(formatDateInput(new Date()).slice(0, 7));
  const [dailyReport, setDailyReport] = useState<SalesReport | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlySalesReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    loadReport();
  }, [token, view, date, month]);

  const loadReport = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (view === "daily") {
        const report = await api.getDailyReport(date, token);
        setDailyReport(report);
      } else {
        const report = await api.getMonthlyReport(month, token);
        setMonthlyReport(report);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const maxHourlyTotal = dailyReport
    ? Math.max(...(dailyReport.hourly || []).map((h) => h.total), 1)
    : 1;

  return (
    <div>
      <Header title="売上レポート" />

      <div className="flex gap-4 mb-6 items-end">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setView("daily")}
            className={cn(
              "px-4 py-2 text-sm font-medium min-h-[44px]",
              view === "daily" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            日次
          </button>
          <button
            onClick={() => setView("monthly")}
            className={cn(
              "px-4 py-2 text-sm font-medium min-h-[44px]",
              view === "monthly" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            月次
          </button>
        </div>

        {view === "daily" ? (
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-48"
          />
        ) : (
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-48"
          />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : view === "daily" && dailyReport ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">総売上</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(dailyReport.total_sales)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">注文数</p>
              <p className="text-3xl font-bold text-gray-900">{dailyReport.order_count}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">客単価</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(dailyReport.average_per_order)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">支払方法別</h3>
              <div className="space-y-3">
                {Object.entries(dailyReport.by_payment_method || {}).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{paymentMethodLabels[method] || method}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">注文種別</h3>
              <div className="space-y-3">
                {Object.entries(dailyReport.by_order_type || {}).map(([type, amount]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{orderTypeLabels[type] || type}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {dailyReport.hourly && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">時間帯別</h3>
              <div className="flex items-end gap-1 h-48">
                {dailyReport.hourly.map((h) => (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 font-medium">
                      {h.total > 0 ? formatCurrency(h.total) : ""}
                    </span>
                    <div
                      className={cn(
                        "w-full rounded-t transition-all",
                        h.total > 0 ? "bg-blue-500" : "bg-gray-100"
                      )}
                      style={{
                        height: `${Math.max((h.total / maxHourlyTotal) * 150, h.total > 0 ? 4 : 2)}px`,
                      }}
                    />
                    <span className="text-xs text-gray-400">{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : view === "monthly" && monthlyReport ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">月間売上</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(monthlyReport.total_sales)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500 mb-1">総注文数</p>
              <p className="text-3xl font-bold text-gray-900">{monthlyReport.total_orders}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">日別集計</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-sm text-gray-500">
                  <th className="px-5 py-3 text-left font-medium">日付</th>
                  <th className="px-5 py-3 text-right font-medium">注文数</th>
                  <th className="px-5 py-3 text-right font-medium">合計</th>
                </tr>
              </thead>
              <tbody>
                {(monthlyReport.daily_totals || []).map((day) => (
                  <tr key={day.date} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-sm text-gray-900">{day.date}</td>
                    <td className="px-5 py-3 text-sm text-gray-600 text-right">{day.order_count}</td>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(day.total)}
                    </td>
                  </tr>
                ))}
                {(!monthlyReport.daily_totals || monthlyReport.daily_totals.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-gray-400">
                      今月のデータはありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-gray-400">日付を選択してください</p>
        </div>
      )}
    </div>
  );
}
