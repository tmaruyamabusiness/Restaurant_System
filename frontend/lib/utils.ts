import { SeatStatus, OrderItemStatus, TakeoutStatus } from "@/types";

export function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("ja-JP", {
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

export function getElapsedMinutes(dateString: string): number {
  const seated = new Date(dateString).getTime();
  const now = Date.now();
  return Math.floor((now - seated) / 60000);
}

export function formatElapsedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function getSeatStatusColor(status: SeatStatus): string {
  const colors: Record<SeatStatus, string> = {
    VACANT: "bg-gray-200 text-gray-700",
    GUIDED: "bg-blue-200 text-blue-800",
    ORDERING: "bg-amber-200 text-amber-800",
    BILLING: "bg-orange-200 text-orange-800",
    CLEANING: "bg-green-200 text-green-800",
  };
  return colors[status];
}

export function getSeatStatusBorder(status: SeatStatus): string {
  const colors: Record<SeatStatus, string> = {
    VACANT: "border-gray-300",
    GUIDED: "border-blue-400",
    ORDERING: "border-amber-400",
    BILLING: "border-orange-400",
    CLEANING: "border-green-400",
  };
  return colors[status];
}

export function getItemStatusColor(status: OrderItemStatus): string {
  const colors: Record<OrderItemStatus, string> = {
    PENDING: "bg-gray-200 text-gray-700",
    COOKING: "bg-amber-200 text-amber-800",
    READY: "bg-green-200 text-green-800",
    SERVED: "bg-blue-200 text-blue-800",
    CANCELLED: "bg-red-200 text-red-800",
  };
  return colors[status];
}

export function getTakeoutStatusColor(status: TakeoutStatus): string {
  const colors: Record<TakeoutStatus, string> = {
    RECEIVED: "bg-blue-200 text-blue-800",
    PREPARING: "bg-amber-200 text-amber-800",
    READY: "bg-green-200 text-green-800",
    PICKED_UP: "bg-gray-200 text-gray-700",
  };
  return colors[status];
}

export function calculateTax(subtotal: number, rate: number = 0.08): number {
  return Math.floor(subtotal * rate);
}

export function getSeatTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    COUNTER: "Counter",
    TABLE_2: "2-Person Table",
    TABLE_4: "4-Person Table",
  };
  return labels[type] || type;
}

export function getSeatTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    COUNTER: "🪑",
    TABLE_2: "🍽️",
    TABLE_4: "🍽️🍽️",
  };
  return icons[type] || "🪑";
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
