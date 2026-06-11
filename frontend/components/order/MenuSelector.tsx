"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { withToast } from "@/stores/toastStore";
import {
  computeTotals,
  MenuCategoryResponse,
  MenuItemResponse,
  OrderItemCreate,
  OrderType,
  taxRateFor,
} from "@/types";

interface SelectedItem extends OrderItemCreate {
  name: string;
  price: number;
  tax_rate: number;
}

interface MenuSelectorProps {
  orderType: OrderType;
  onSubmit: (items: OrderItemCreate[]) => void;
  onCancel: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export default function MenuSelector({
  orderType,
  onSubmit,
  onCancel,
  loading,
  submitLabel = "注文を確定する",
}: MenuSelectorProps) {
  const [categories, setCategories] = useState<MenuCategoryResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  useEffect(() => {
    (async () => {
      const cats = await withToast(() => api.getMenu());
      if (cats) {
        setCategories(cats);
        if (cats.length > 0) setSelectedCategory(cats[0].id);
      }
      setLoadingMenu(false);
    })();
  }, []);

  const allItems = useMemo(
    () => categories.flatMap((c) => c.items ?? []),
    [categories]
  );

  const visibleItems = useMemo(() => {
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return allItems.filter((i) => i.name.toLowerCase().includes(q));
    }
    return allItems.filter((i) => i.category_id === selectedCategory);
  }, [allItems, search, selectedCategory]);

  const addItem = (item: MenuItemResponse) => {
    setSelected((prev) => {
      const existing = prev.find((s) => s.menu_item_id === item.id);
      if (existing) {
        return prev.map((s) =>
          s.menu_item_id === item.id ? { ...s, quantity: s.quantity + 1 } : s
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
          price: item.price,
          tax_rate: taxRateFor(orderType, item.tax_type),
          quantity: 1,
          notes: "",
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setSelected((prev) =>
      prev
        .map((s) =>
          s.menu_item_id === menuItemId ? { ...s, quantity: s.quantity + delta } : s
        )
        .filter((s) => s.quantity > 0)
    );
  };

  const updateNotes = (menuItemId: string, notes: string) => {
    setSelected((prev) =>
      prev.map((s) => (s.menu_item_id === menuItemId ? { ...s, notes } : s))
    );
  };

  // サーバーと同じ計算ロジック(@oms/shared)で税込合計をプレビュー
  const totals = computeTotals(
    selected.map((s) => ({ unit_price: s.price, quantity: s.quantity, tax_rate: s.tax_rate }))
  );

  const handleSubmit = () => {
    if (selected.length === 0) return;
    onSubmit(
      selected.map((s) => ({
        menu_item_id: s.menu_item_id,
        quantity: s.quantity,
        notes: s.notes || undefined,
      }))
    );
  };

  if (loadingMenu) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <Input
          placeholder="🔍 メニューを検索（例: からあげ）"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3"
        />
        {!search.trim() && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "min-h-[42px] whitespace-nowrap rounded-lg border px-3.5 py-2 text-[13px]",
                  selectedCategory === cat.id
                    ? "border-blue-600 bg-blue-600 font-bold text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                )}
              >
                {cat.name}
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-1.5 py-0.5 text-[11px]",
                    selectedCategory === cat.id ? "bg-white/20" : "bg-gray-100"
                  )}
                >
                  {cat.items?.length ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {visibleItems.map((item) => {
            const sel = selected.find((s) => s.menu_item_id === item.id);
            return (
              <button
                key={item.id}
                onClick={() => addItem(item)}
                className={cn(
                  "min-h-[44px] rounded-xl border-2 p-3 text-left transition-all",
                  sel
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                <p className="truncate text-sm font-semibold text-gray-900">
                  {item.name}
                  {sel && (
                    <span className="float-right rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
                      ×{sel.quantity}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[13px] font-bold text-blue-600">
                  {formatCurrency(item.price)}
                </p>
              </button>
            );
          })}
          {visibleItems.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-gray-400">
              {search.trim() ? "該当する商品がありません" : "このカテゴリに商品がありません"}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-900">
          🛒 選択中の注文（{selected.reduce((s, i) => s + i.quantity, 0)}品）
        </h4>
        <div className="max-h-[300px] space-y-1 overflow-y-auto">
          {selected.length === 0 && (
            <p className="py-6 text-center text-xs text-gray-400">
              左の一覧から商品をタップしてください
            </p>
          )}
          {selected.map((item) => (
            <div key={item.menu_item_id} className="border-b border-gray-50 py-2">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-gray-900">
                  {item.name}
                </p>
                <button
                  onClick={() => updateQuantity(item.menu_item_id, -1)}
                  className="h-8 w-8 rounded-full bg-gray-100 text-base font-bold text-gray-600 hover:bg-gray-200"
                  aria-label="減らす"
                >
                  −
                </button>
                <b className="w-6 text-center text-sm">{item.quantity}</b>
                <button
                  onClick={() => updateQuantity(item.menu_item_id, 1)}
                  className="h-8 w-8 rounded-full bg-blue-100 text-base font-bold text-blue-700 hover:bg-blue-200"
                  aria-label="増やす"
                >
                  ＋
                </button>
                <b className="w-16 text-right text-[13px]">
                  {formatCurrency(item.price * item.quantity)}
                </b>
              </div>
              <input
                placeholder="備考を追加 ✎"
                value={item.notes ?? ""}
                onChange={(e) => updateNotes(item.menu_item_id, e.target.value)}
                className="mt-1 w-full rounded-md border border-transparent bg-gray-50 px-2 py-1 text-xs focus:border-gray-300 focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-[13px] text-gray-600">
          <div className="flex justify-between">
            <span>小計</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>消費税</span>
            <span>{formatCurrency(totals.tax_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-extrabold text-gray-900">
            <span>合計</span>
            <span>{formatCurrency(totals.total_amount)}</span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={selected.length === 0 || loading}
          size="lg"
          className="mt-3 w-full"
        >
          {loading ? "送信中..." : `${submitLabel}（${formatCurrency(totals.total_amount)}）`}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="mt-1 w-full">
          キャンセル
        </Button>
      </div>
    </div>
  );
}
