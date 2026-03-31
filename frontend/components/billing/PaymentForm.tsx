"use client";

import { useState } from "react";
import { PaymentMethod } from "@/types";
import { formatCurrency, cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
  received_amount?: number;
}

interface PaymentFormProps {
  subtotal: number;
  tax: number;
  total: number;
  onSubmit: (data: {
    payments: PaymentEntry[];
    discount_amount?: number;
    discount_percentage?: number;
    print_receipt: boolean;
  }) => void;
  loading?: boolean;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: "CASH", label: "現金", icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" },
  { value: "CREDIT_CARD", label: "クレジットカード", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { value: "QR", label: "QR決済", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" },
];

export default function PaymentForm({ subtotal, tax, total, onSubmit, loading }: PaymentFormProps) {
  const [discountType, setDiscountType] = useState<"amount" | "percentage">("amount");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [splitPayment, setSplitPayment] = useState(false);
  const [payments, setPayments] = useState<PaymentEntry[]>([{ method: "CASH", amount: total, received_amount: 0 }]);
  const [printReceipt, setPrintReceipt] = useState(true);

  const discountAmount = discountType === "amount" ? discountValue : Math.floor(subtotal * (discountValue / 100));
  const finalTotal = Math.max(0, total - discountAmount);
  const change = payments[0]?.method === "CASH" && payments[0]?.received_amount
    ? Math.max(0, (payments[0].received_amount || 0) - finalTotal)
    : 0;

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleMethodSelect = (method: PaymentMethod) => {
    if (splitPayment) {
      setPayments((prev) => [...prev, { method, amount: 0 }]);
    } else {
      setPayments([{ method, amount: finalTotal, received_amount: method === "CASH" ? 0 : undefined }]);
    }
  };

  const updatePayment = (index: number, updates: Partial<PaymentEntry>) => {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)));
  };

  const removePayment = (index: number) => {
    if (payments.length <= 1) return;
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const finalPayments = payments.map((p) => ({
      ...p,
      amount: splitPayment ? p.amount : finalTotal,
    }));
    onSubmit({
      payments: finalPayments,
      discount_amount: discountType === "amount" && discountValue > 0 ? discountValue : undefined,
      discount_percentage: discountType === "percentage" && discountValue > 0 ? discountValue : undefined,
      print_receipt: printReceipt,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">小計</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">税（8%）</span>
          <span className="font-medium">{formatCurrency(tax)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-red-600">
            <span>値引き</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
          <span>合計</span>
          <span>{formatCurrency(finalTotal)}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">値引き</label>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setDiscountType("amount")}
              className={cn(
                "px-3 py-2 text-sm min-h-[44px]",
                discountType === "amount" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
              )}
            >
              金額
            </button>
            <button
              onClick={() => setDiscountType("percentage")}
              className={cn(
                "px-3 py-2 text-sm min-h-[44px]",
                discountType === "percentage" ? "bg-blue-600 text-white" : "bg-white text-gray-700"
              )}
            >
              %
            </button>
          </div>
          <Input
            type="number"
            min={0}
            value={discountValue || ""}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            placeholder={discountType === "amount" ? "値引き額" : "割引率"}
            className="flex-1"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">支払方法</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={splitPayment}
              onChange={(e) => {
                setSplitPayment(e.target.checked);
                if (!e.target.checked) {
                  setPayments([payments[0]]);
                }
              }}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">分割払い</span>
          </label>
        </div>

        {!splitPayment && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {paymentMethods.map((pm) => (
              <button
                key={pm.value}
                onClick={() => handleMethodSelect(pm.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all min-h-[44px]",
                  payments[0]?.method === pm.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={pm.icon} />
                </svg>
                <span className="text-xs font-medium">{pm.label}</span>
              </button>
            ))}
          </div>
        )}

        {payments.map((payment, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {splitPayment ? `支払い ${idx + 1}` : ""}{" "}
                {paymentMethods.find((m) => m.value === payment.method)?.label}
              </span>
              {splitPayment && payments.length > 1 && (
                <button onClick={() => removePayment(idx)} className="text-red-500 text-xs hover:text-red-700">
                  削除
                </button>
              )}
            </div>

            {splitPayment && (
              <div className="mb-2">
                <div className="flex gap-2 mb-2">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.value}
                      onClick={() => updatePayment(idx, { method: pm.value })}
                      className={cn(
                        "px-3 py-1 rounded text-xs min-h-[32px]",
                        payment.method === pm.value ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                      )}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={0}
                  value={payment.amount || ""}
                  onChange={(e) => updatePayment(idx, { amount: Number(e.target.value) })}
                  placeholder="金額"
                />
              </div>
            )}

            {payment.method === "CASH" && (
              <div className="space-y-2">
                <Input
                  type="number"
                  min={0}
                  label="預かり金額"
                  value={payment.received_amount || ""}
                  onChange={(e) => updatePayment(idx, { received_amount: Number(e.target.value) })}
                  placeholder="預かり金額"
                />
                {!splitPayment && (payment.received_amount || 0) >= finalTotal && (
                  <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                    <span className="text-green-700">お釣り</span>
                    <span className="font-bold text-green-700">{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {splitPayment && (
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => setPayments((prev) => [...prev, { method: "CASH", amount: 0 }])}>
              + 支払いを追加
            </Button>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">配分合計</span>
              <span className={cn("font-medium", totalPaid === finalTotal ? "text-green-600" : "text-red-600")}>
                {formatCurrency(totalPaid)} / {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={printReceipt}
          onChange={(e) => setPrintReceipt(e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">レシート印刷</span>
      </label>

      <Button
        onClick={handleSubmit}
        disabled={loading || (splitPayment && totalPaid !== finalTotal)}
        className="w-full"
        size="lg"
      >
        {loading ? "処理中..." : `会計確定（${formatCurrency(finalTotal)}）`}
      </Button>
    </div>
  );
}
