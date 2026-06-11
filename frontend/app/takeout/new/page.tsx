"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import MenuSelector from "@/components/order/MenuSelector";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import { cn, formatDateTimeLocalInput, formatTime } from "@/lib/utils";
import { useTakeoutStore } from "@/stores/takeoutStore";
import { toast, withToast } from "@/stores/toastStore";
import { OrderItemCreate } from "@/types";

const STEPS = ["顧客情報", "商品選択", "確認"] as const;
const QUICK_MINUTES = [15, 30, 45];

/** 数字以外を除去してハイフン整形(0X0-XXXX-XXXX 系の簡易整形) */
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function isValidPhone(phone: string): boolean {
  return /^0\d{1,3}-?\d{2,4}-?\d{3,4}$/.test(phone);
}

/** ローカル(日本)時刻のまま datetime-local 値を作る。toISOString のUTCズレを避ける */
function plusMinutesLocal(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return formatDateTimeLocalInput(d);
}

export default function NewTakeoutPage() {
  const router = useRouter();
  const applyTakeout = useTakeoutStore((s) => s.applyTakeout);
  const [step, setStep] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupLocal, setPickupLocal] = useState(plusMinutesLocal(30));
  const [quickSel, setQuickSel] = useState<number | null>(30);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<OrderItemCreate[]>([]);
  const [itemsPreview, setItemsPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const infoValid = customerName.trim().length > 0 && isValidPhone(phone) && !!pickupLocal;
  const pickupIso = useMemo(
    () => (pickupLocal ? new Date(pickupLocal).toISOString() : ""),
    [pickupLocal]
  );

  const handleSubmit = async () => {
    setLoading(true);
    const created = await withToast(() =>
      api.createTakeoutOrder({
        customer_name: customerName.trim(),
        phone_number: phone,
        pickup_at: pickupIso,
        notes: notes.trim() || undefined,
        items,
      })
    );
    setLoading(false);
    if (created) {
      applyTakeout(created);
      toast.success(`${created.customer_name} 様のテイクアウトを受け付けました`);
      router.push("/takeout");
    }
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

      <div className="mb-5 flex items-center">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            {i > 0 && <div className="mx-2 h-0.5 w-9 bg-gray-200" />}
            <span
              className={cn(
                "flex items-center gap-1.5 text-xs",
                i === step ? "font-bold text-blue-700" : i < step ? "text-emerald-700" : "text-gray-400"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                  i === step
                    ? "bg-blue-600 text-white"
                    : i < step
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-200 text-gray-500"
                )}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {label}
            </span>
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <Input
            id="customerName"
            label="お客様のお名前 *"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="例: 佐藤"
          />
          <div>
            <Input
              id="phone"
              label="電話番号 *"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="090-1234-5678"
              error={phone && !isValidPhone(phone) ? "電話番号の形式が正しくありません" : undefined}
            />
            {phone && isValidPhone(phone) && (
              <p className="mt-1 text-xs font-semibold text-emerald-600">✓ 形式チェック済み</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">受取時刻 *</label>
            <div className="mb-2 flex flex-wrap gap-2">
              {QUICK_MINUTES.map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPickupLocal(plusMinutesLocal(m));
                    setQuickSel(m);
                  }}
                  className={cn(
                    "min-h-[40px] rounded-full border px-3.5 text-[13px] font-semibold",
                    quickSel === m
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-700"
                  )}
                >
                  +{m}分（{formatTime(new Date(Date.now() + m * 60000).toISOString())}）
                </button>
              ))}
            </div>
            <Input
              type="datetime-local"
              value={pickupLocal}
              onChange={(e) => {
                setPickupLocal(e.target.value);
                setQuickSel(null);
              }}
            />
            <p className="mt-1 text-xs text-gray-400">店舗のタイムゾーン（日本時間）で指定します</p>
          </div>
          <Input
            id="notes"
            label="備考"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="アレルギー対応など"
          />
          <Button size="lg" className="w-full" disabled={!infoValid} onClick={() => setStep(1)}>
            次へ — 商品を選択
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <MenuSelector
            orderType="TAKEOUT"
            submitLabel="この内容で確認へ"
            onSubmit={(selected) => {
              setItems(selected);
              setItemsPreview(`${selected.reduce((s, i) => s + i.quantity, 0)}品`);
              setStep(2);
            }}
            onCancel={() => setStep(0)}
          />
        </div>
      )}

      {step === 2 && (
        <div className="max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-gray-900">受付内容の確認</h3>
          <dl className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
            {[
              ["お名前", `${customerName} 様`],
              ["電話番号", phone],
              ["受取時刻", new Date(pickupLocal).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })],
              ["商品", itemsPreview],
              ["備考", notes || "なし"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <dt className="text-gray-500">{k}</dt>
                <dd className="font-semibold text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-gray-400">
            お支払いは受け渡し時、またはテイクアウト一覧の「会計して受け渡し」から行えます
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep(1)}>
              戻る
            </Button>
            <Button className="flex-1" size="lg" disabled={loading} onClick={handleSubmit}>
              {loading ? "送信中..." : "受付を確定する"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
