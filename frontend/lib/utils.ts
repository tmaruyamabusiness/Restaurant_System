import { OrderItemStatus, SeatStatus, SeatType, TakeoutStatus } from "@/types";

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** datetime-local 用にローカル時刻で整形(toISOString はUTCになるため使わない) */
export function formatDateTimeLocalInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${formatDateInput(date)}T${h}:${m}`;
}

export function getElapsedMinutes(dateString: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60000));
}

export function formatElapsedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  return `${Math.floor(minutes / 60)}時間${String(minutes % 60).padStart(2, "0")}分`;
}

/** カード全面をステータス色で塗る(遠目での判別性重視) */
export function getSeatCardStyle(status: SeatStatus): string {
  const styles: Record<SeatStatus, string> = {
    VACANT: "bg-white border-gray-200 text-gray-700",
    GUIDED: "bg-blue-500 border-blue-500 text-white",
    ORDERING: "bg-amber-500 border-amber-500 text-white",
    BILLING: "bg-orange-500 border-orange-500 text-white",
    CLEANING: "bg-emerald-500 border-emerald-500 text-white",
  };
  return styles[status];
}

export function getSeatStatusChip(status: SeatStatus): string {
  const styles: Record<SeatStatus, string> = {
    VACANT: "bg-white border border-gray-300 text-gray-600",
    GUIDED: "bg-blue-500 text-white",
    ORDERING: "bg-amber-500 text-white",
    BILLING: "bg-orange-500 text-white",
    CLEANING: "bg-emerald-500 text-white",
  };
  return styles[status];
}

export function getItemStatusColor(status: OrderItemStatus): string {
  const colors: Record<OrderItemStatus, string> = {
    PENDING: "bg-gray-100 text-gray-600",
    COOKING: "bg-amber-100 text-amber-700",
    SERVED: "bg-emerald-100 text-emerald-700",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return colors[status];
}

export function getTakeoutStatusColor(status: TakeoutStatus): string {
  const colors: Record<TakeoutStatus, string> = {
    RECEIVED: "bg-blue-100 text-blue-700",
    PREPARING: "bg-amber-100 text-amber-700",
    READY: "bg-emerald-100 text-emerald-700",
    PICKED_UP: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-red-100 text-red-700",
  };
  return colors[status];
}

export function getSeatTypeLabel(type: SeatType): string {
  const labels: Record<SeatType, string> = {
    TABLE: "テーブル",
    COUNTER: "カウンター",
    PRIVATE: "個室",
  };
  return labels[type];
}

export function getSeatTypeIcon(type: SeatType): string {
  const icons: Record<SeatType, string> = {
    TABLE: "🪑",
    COUNTER: "🍶",
    PRIVATE: "🚪",
  };
  return icons[type];
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    VACANT: "空席",
    GUIDED: "案内済",
    ORDERING: "注文中",
    BILLING: "会計中",
    CLEANING: "清掃中",
    PENDING: "調理待ち",
    COOKING: "調理中",
    SERVED: "提供済",
    CANCELLED: "キャンセル",
    RECEIVED: "受付済",
    PREPARING: "調理中",
    READY: "準備完了",
    PICKED_UP: "受渡済",
    OPEN: "未会計",
    CLOSED: "会計済",
    CASH: "現金",
    CREDIT_CARD: "クレジットカード",
    QR: "QR決済",
    OWNER: "オーナー",
    MANAGER: "マネージャー",
    STAFF: "スタッフ",
    TABLE: "テーブル",
    COUNTER: "カウンター",
    PRIVATE: "個室",
    DINE_IN: "店内",
    TAKEOUT: "テイクアウト",
  };
  return labels[status] || status;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
