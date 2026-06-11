"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn, formatCurrency } from "@/lib/utils";
import {
  computeTotals,
  DiscountInput,
  PaymentLineInput,
  PaymentMethod,
  PricedItem,
} from "@/types";

interface PaymentFormProps {
  items: PricedItem[];
  onSubmit: (data: {
    lines: PaymentLineInput[];
    discount?: DiscountInput;
    receipt_issued: boolean;
  }) => void;
  loading?: boolean;
}

const METHODS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: "CASH", label: "現金", emoji: "💴" },
  { value: "CREDIT_CARD", label: "クレジット", emoji: "💳" },
  { value: "QR", label: "QR決済", emoji: "📱" },
];

const TENKEY = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "00", "0", "C"];

export default function PaymentForm({ items, onSubmit, loading }: PaymentFormProps) {
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [discountValue, setDiscountValue] = useState(0);
  const [split, setSplit] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [received, setReceived] = useState(0);
  const [splitLines, setSplitLines] = useState<{ method: PaymentMethod; amount: number }[]>([
    { method: "CASH", amount: 0 },
  ]);
  const [receipt, setReceipt] = useState(true);

  const discount: DiscountInput | undefined =
    discountValue > 0 ? { type: discountType, value: discountValue } : undefined;

  // サーバーと同一ロジック(@oms/shared)で計算するため金額が一致する
  const totals = useMemo(() => computeTotals(items, discount ?? null), [items, discount]);
  const total = totals.total_amount;

  const change = method === "CASH" && received > total ? received - total : 0;
  const splitSum = splitLines.reduce((s, l) => s + l.amount, 0);

  const canSubmit = split
    ? splitSum === total && total > 0
    : method !== "CASH" || received >= total;

  const handleSubmit = () => {
    const lines: PaymentLineInput[] = split
      ? splitLines.filter((l) => l.amount > 0)
      : [
          {
            method,
            amount: total,
            received_amount: method === "CASH" ? Math.max(received, total) : undefined,
          },
        ];
    onSubmit({ lines, discount, receipt_issued: receipt });
  };

  const pressKey = (key: string) => {
    if (key === "C") return setReceived(0);
    setReceived((prev) => {
      const next = Number(`${prev || ""}${key}`);
      return Number.isSafeInteger(next) && next <= 99_999_999 ? next : prev;
    });
  };

  return (
    <div className="space-y-5">
      {/* 値引き */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">値引き</label>
        <div className="flex gap-2">
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(["FIXED", "PERCENTAGE"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setDiscountType(t);
                  setDiscountValue(0);
                }}
                className={cn(
                  "min-h-[44px] px-4 text-sm",
                  discountType === t ? "bg-blue-600 font-bold text-white" : "bg-white text-gray-600"
                )}
              >
                {t === "FIXED" ? "金額" : "%"}
              </button>
            ))}
          </div>
          <Input
            type="number"
            min={0}
            max={discountType === "PERCENTAGE" ? 100 : undefined}
            value={discountValue || ""}
            onChange={(e) =>
              setDiscountValue(
                Math.max(
                  0,
                  discountType === "PERCENTAGE"
                    ? Math.min(100, Number(e.target.value))
                    : Number(e.target.value)
                )
              )
            }
            placeholder={discountType === "FIXED" ? "値引き額" : "割引率(0〜100)"}
            className="flex-1"
          />
        </div>
      </div>

      {/* 支払方法 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">支払方法</label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={split}
              onChange={(e) => setSplit(e.target.checked)}
              className="rounded border-gray-300"
            />
            分割払い
          </label>
        </div>

        {!split ? (
          <>
            <div className="mb-4 grid grid-cols-3 gap-2.5">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setMethod(m.value);
                    setReceived(0);
                  }}
                  className={cn(
                    "min-h-[64px] rounded-xl border-2 py-3 text-center text-[13px] font-bold",
                    method === m.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  <span className="block text-xl">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>

            <div className="mb-3 rounded-xl bg-gray-50 px-4 py-3">
              <div className="flex justify-between py-1 text-sm text-gray-600">
                <span>お会計</span>
                <b className="text-lg text-gray-900">{formatCurrency(total)}</b>
              </div>
              {method === "CASH" && (
                <div className="flex justify-between py-1 text-sm text-gray-600">
                  <span>お預かり</span>
                  <b className="text-lg text-blue-700">{formatCurrency(received)}</b>
                </div>
              )}
            </div>

            {method === "CASH" && (
              <>
                <div
                  className={cn(
                    "mb-3 flex items-center justify-between rounded-xl border px-4 py-3",
                    received >= total
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-gray-200 bg-white"
                  )}
                >
                  <span className="text-[15px] font-bold text-emerald-700">おつり</span>
                  <b className="text-3xl text-emerald-700">{formatCurrency(change)}</b>
                </div>
                <div className="mb-2 flex gap-2">
                  {[
                    { label: "ちょうど", amount: total },
                    { label: "¥5,000", amount: 5000 },
                    { label: "¥10,000", amount: 10000 },
                  ].map((q) => (
                    <button
                      key={q.label}
                      onClick={() => setReceived(q.amount)}
                      className="min-h-[46px] flex-1 rounded-lg border border-gray-300 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TENKEY.map((key) => (
                    <button
                      key={key}
                      onClick={() => pressKey(key)}
                      className={cn(
                        "min-h-[56px] rounded-lg border border-gray-300 text-xl font-bold text-gray-900 hover:bg-gray-50",
                        (key === "00" || key === "C") && "bg-gray-100 text-base"
                      )}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {splitLines.map((line, idx) => (
              <div key={idx} className="rounded-lg bg-gray-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {METHODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() =>
                          setSplitLines((prev) =>
                            prev.map((l, i) => (i === idx ? { ...l, method: m.value } : l))
                          )
                        }
                        className={cn(
                          "min-h-[34px] rounded px-3 text-xs font-semibold",
                          line.method === m.value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {splitLines.length > 1 && (
                    <button
                      onClick={() => setSplitLines((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  )}
                </div>
                <Input
                  type="number"
                  min={0}
                  value={line.amount || ""}
                  onChange={(e) =>
                    setSplitLines((prev) =>
                      prev.map((l, i) =>
                        i === idx ? { ...l, amount: Math.max(0, Number(e.target.value)) } : l
                      )
                    )
                  }
                  placeholder="金額"
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSplitLines((prev) => [...prev, { method: "CASH", amount: 0 }])}
            >
              + 支払いを追加
            </Button>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">配分合計</span>
              <b className={splitSum === total ? "text-emerald-600" : "text-red-600"}>
                {formatCurrency(splitSum)} / {formatCurrency(total)}
              </b>
            </div>
          </div>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={receipt}
          onChange={(e) => setReceipt(e.target.checked)}
          className="rounded border-gray-300"
        />
        レシートを印刷する
      </label>

      <Button
        onClick={handleSubmit}
        disabled={loading || !canSubmit}
        size="lg"
        className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
      >
        {loading ? "処理中..." : `会計を確定する（${formatCurrency(total)}）`}
      </Button>
    </div>
  );
}
