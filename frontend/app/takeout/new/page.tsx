"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useTakeoutStore } from "@/stores/takeoutStore";
import { PaymentMethod } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MenuSelector from "@/components/order/MenuSelector";

export default function NewTakeoutPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { addTakeoutOrder } = useTakeoutStore();
  const [step, setStep] = useState<"info" | "menu" | "review">("info");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [prepay, setPrepay] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [selectedItems, setSelectedItems] = useState<{ menu_item_id: string; quantity: number; notes?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMenuSubmit = (items: { menu_item_id: string; quantity: number; notes?: string }[]) => {
    setSelectedItems(items);
    setStep("review");
  };

  const handleSubmit = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const order = await api.createTakeoutOrder(
        {
          customer_name: customerName,
          customer_phone: customerPhone,
          pickup_time: new Date(pickupTime).toISOString(),
          items: selectedItems,
          prepay,
          payment_method: prepay ? paymentMethod : undefined,
        },
        token
      );
      addTakeoutOrder(order);
      router.push("/takeout");
    } catch (err) {
      setError((err as Error).message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const getDefaultPickupTime = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div>
      <Header
        title="テイクアウト新規注文"
        actions={
          <Button variant="ghost" onClick={() => router.push("/takeout")}>
            キャンセル
          </Button>
        }
      />

      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          {["info", "menu", "review"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                  step === s
                    ? "bg-blue-600 text-white"
                    : ["info", "menu", "review"].indexOf(step) > i
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-12 h-0.5 bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>

        {step === "info" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">お客様情報</h3>
            <Input
              id="name"
              label="お客様名"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="お客様名"
              required
            />
            <Input
              id="phone"
              label="電話番号"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="090-1234-5678"
              required
            />
            <Input
              id="pickup"
              label="受取時間"
              type="datetime-local"
              value={pickupTime || getDefaultPickupTime()}
              onChange={(e) => setPickupTime(e.target.value)}
              required
            />

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prepay}
                  onChange={(e) => setPrepay(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">前払い</span>
              </label>

              {prepay && (
                <div className="mt-3 flex gap-2">
                  {(["CASH", "CREDIT_CARD", "QR"] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]",
                        paymentMethod === m
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}
                    >
                      {({"CASH": "現金", "CREDIT_CARD": "クレジットカード", "QR": "QR決済"} as Record<string, string>)[m] || m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Button
              onClick={() => {
                if (!pickupTime) setPickupTime(getDefaultPickupTime());
                setStep("menu");
              }}
              disabled={!customerName || !customerPhone}
              className="w-full"
            >
              次へ - 商品選択
            </Button>
          </div>
        )}

        {step === "menu" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">メニューから選択</h3>
            <MenuSelector
              onSubmit={handleMenuSubmit}
              onCancel={() => setStep("info")}
            />
          </div>
        )}

        {step === "review" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">注文内容確認</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">お客様</span>
                <span className="font-medium">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">電話番号</span>
                <span className="font-medium">{customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">受取時間</span>
                <span className="font-medium">
                  {new Date(pickupTime || getDefaultPickupTime()).toLocaleString("ja-JP")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">支払い</span>
                <span className="font-medium">{prepay ? `前払い（${({"CASH": "現金", "CREDIT_CARD": "クレジットカード", "QR": "QR決済"} as Record<string, string>)[paymentMethod] || paymentMethod}）` : "受取時支払い"}</span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-2">{selectedItems.length}品選択済み</p>
              <Button variant="outline" size="sm" onClick={() => setStep("menu")}>
                商品を変更
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep("menu")} className="flex-1">
                戻る
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? "作成中..." : "注文を確定"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
