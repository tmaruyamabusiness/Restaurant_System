"use client";

import { useToastStore } from "@/stores/toastStore";
import { cn } from "@/lib/utils";

const ICONS = { success: "✓", error: "!", info: "i" } as const;
const ICON_BG = {
  success: "bg-emerald-500",
  error: "bg-red-500",
  info: "bg-blue-500",
} as const;

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-md" role="status">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-white shadow-2xl",
            "bg-slate-900/95 backdrop-blur animate-[slidein_.2s_ease-out]"
          )}
        >
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
              ICON_BG[t.kind]
            )}
          >
            {ICONS[t.kind]}
          </span>
          {t.message}
        </button>
      ))}
    </div>
  );
}
