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
        title="New Takeout Order"
        actions={
          <Button variant="ghost" onClick={() => router.push("/takeout")}>
            Cancel
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
            <h3 className="font-semibold text-gray-900">Customer Information</h3>
            <Input
              id="name"
              label="Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              required
            />
            <Input
              id="phone"
              label="Phone Number"
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="090-1234-5678"
              required
            />
            <Input
              id="pickup"
              label="Pickup Time"
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
                <span className="text-sm text-gray-700">Prepay</span>
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
                      {m.replace(/_/g, " ")}
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
              Next - Select Items
            </Button>
          </div>
        )}

        {step === "menu" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Select Menu Items</h3>
            <MenuSelector
              onSubmit={handleMenuSubmit}
              onCancel={() => setStep("info")}
            />
          </div>
        )}

        {step === "review" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">Order Summary</h3>

            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Customer</span>
                <span className="font-medium">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Phone</span>
                <span className="font-medium">{customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pickup</span>
                <span className="font-medium">
                  {new Date(pickupTime || getDefaultPickupTime()).toLocaleString("ja-JP")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment</span>
                <span className="font-medium">{prepay ? `Prepay (${paymentMethod.replace(/_/g, " ")})` : "Pay on pickup"}</span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-2">{selectedItems.length} items selected</p>
              <Button variant="outline" size="sm" onClick={() => setStep("menu")}>
                Edit Items
              </Button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep("menu")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                {loading ? "Creating..." : "Submit Order"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
