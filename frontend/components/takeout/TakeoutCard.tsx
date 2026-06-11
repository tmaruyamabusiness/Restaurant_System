"use client";

import Button from "@/components/ui/Button";
import { cn, formatCurrency, formatTime } from "@/lib/utils";
import { TakeoutResponse, TakeoutStatus } from "@/types";

interface TakeoutCardProps {
  takeout: TakeoutResponse;
  onChangeStatus: (takeout: TakeoutResponse, status: TakeoutStatus) => void;
  onPay: (takeout: TakeoutResponse) => void;
}

function remainingLabel(pickupAt: string): { label: string; urgent: boolean } {
  const diffMin = Math.round((new Date(pickupAt).getTime() - Date.now()) / 60000);
  if (diffMin < 0) return { label: `${-diffMin}分超過 ⚠`, urgent: true };
  return { label: `あと${diffMin}分${diffMin <= 10 ? " ⚠" : ""}`, urgent: diffMin <= 10 };
}

const BORDER: Record<TakeoutStatus, string> = {
  RECEIVED: "border-l-slate-400",
  PREPARING: "border-l-amber-500",
  READY: "border-l-emerald-500",
  PICKED_UP: "border-l-gray-300",
  CANCELLED: "border-l-red-300",
};

export default function TakeoutCard({ takeout, onChangeStatus, onPay }: TakeoutCardProps) {
  const remaining = remainingLabel(takeout.pickup_at);
  const itemSummary = takeout.orders
    .flatMap((o) => o.items.filter((i) => i.status !== "CANCELLED"))
    .map((i) => `${i.item_name} ×${i.quantity}`)
    .join("、");
  const finished = takeout.status === "PICKED_UP" || takeout.status === "CANCELLED";

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 border-l-[5px] bg-white p-4",
        BORDER[takeout.status],
        remaining.urgent && !finished && "border-l-red-500"
      )}
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-[22px] font-extrabold text-gray-900">
            {formatTime(takeout.pickup_at)}
          </p>
          {!finished && (
            <p
              className={cn(
                "text-xs font-semibold",
                remaining.urgent ? "text-red-600" : "text-gray-500"
              )}
            >
              {remaining.label}
            </p>
          )}
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            takeout.paid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          )}
        >
          {takeout.paid ? "前払済" : "未払"}
        </span>
      </div>

      <p className="text-[15px] font-bold text-gray-900">
        {takeout.customer_name} 様（#T{takeout.orders[0]?.order_number ?? "-"}）
      </p>
      <a href={`tel:${takeout.phone_number}`} className="text-[13px] text-blue-600">
        📞 {takeout.phone_number}
      </a>
      <p className="my-2.5 text-[13px] leading-relaxed text-gray-500">
        {itemSummary || "(商品なし)"} ・ <b>{formatCurrency(takeout.total_amount)}</b>
      </p>
      {takeout.notes && <p className="mb-2 text-xs text-amber-600">備考: {takeout.notes}</p>}

      {takeout.status === "RECEIVED" && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => onChangeStatus(takeout, "PREPARING")}
        >
          受付済 — 調理開始
        </Button>
      )}
      {takeout.status === "PREPARING" && (
        <Button
          className="w-full bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
          onClick={() => onChangeStatus(takeout, "READY")}
        >
          調理中 — 準備完了にする
        </Button>
      )}
      {takeout.status === "READY" &&
        (takeout.paid ? (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
            onClick={() => onChangeStatus(takeout, "PICKED_UP")}
          >
            ✓ 受け渡し完了
          </Button>
        ) : (
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
            onClick={() => onPay(takeout)}
          >
            💴 会計して受け渡し
          </Button>
        ))}
    </div>
  );
}
