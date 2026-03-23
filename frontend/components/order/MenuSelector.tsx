"use client";

import { useState, useEffect } from "react";
import { MenuCategory, MenuItem } from "@/types";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { formatCurrency, cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface SelectedItem {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

interface MenuSelectorProps {
  onSubmit: (items: { menu_item_id: string; quantity: number; notes?: string }[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function MenuSelector({ onSubmit, onCancel, loading }: MenuSelectorProps) {
  const { token } = useAuthStore();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [cats, items] = await Promise.all([
          api.getCategories(token),
          api.getMenuItems(token),
        ]);
        setCategories(cats.filter((c) => c.active));
        setMenuItems(items.filter((i) => i.available));
        if (cats.length > 0) setSelectedCategory(cats[0].id);
      } catch {
        // silently fail
      } finally {
        setLoadingMenu(false);
      }
    };
    load();
  }, [token]);

  const filteredItems = selectedCategory
    ? menuItems.filter((i) => i.category_id === selectedCategory)
    : menuItems;

  const addItem = (item: MenuItem) => {
    setSelectedItems((prev) => {
      const existing = prev.find((s) => s.menu_item_id === item.id);
      if (existing) {
        return prev.map((s) =>
          s.menu_item_id === item.id ? { ...s, quantity: s.quantity + 1 } : s
        );
      }
      return [...prev, { menu_item_id: item.id, name: item.name, price: item.price, quantity: 1, notes: "" }];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setSelectedItems((prev) =>
      prev
        .map((s) =>
          s.menu_item_id === menuItemId ? { ...s, quantity: Math.max(0, s.quantity + delta) } : s
        )
        .filter((s) => s.quantity > 0)
    );
  };

  const updateNotes = (menuItemId: string, notes: string) => {
    setSelectedItems((prev) =>
      prev.map((s) => (s.menu_item_id === menuItemId ? { ...s, notes } : s))
    );
  };

  const subtotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = () => {
    if (selectedItems.length === 0) return;
    onSubmit(
      selectedItems.map((i) => ({
        menu_item_id: i.menu_item_id,
        quantity: i.quantity,
        notes: i.notes || undefined,
      }))
    );
  };

  if (loadingMenu) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 border-b border-gray-200">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]",
              selectedCategory === cat.id
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-[300px] overflow-y-auto">
        {filteredItems.map((item) => {
          const selected = selectedItems.find((s) => s.menu_item_id === item.id);
          return (
            <button
              key={item.id}
              onClick={() => addItem(item)}
              className={cn(
                "text-left p-3 rounded-lg border-2 transition-all min-h-[44px]",
                selected
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              )}
            >
              <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
              <p className="text-sm text-blue-600 font-semibold mt-1">{formatCurrency(item.price)}</p>
              {selected && (
                <p className="text-xs text-blue-500 mt-1">x{selected.quantity}</p>
              )}
            </button>
          );
        })}
        {filteredItems.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-8 text-sm">
            No items in this category
          </p>
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <h4 className="font-semibold text-sm text-gray-700">Selected Items</h4>
          <div className="max-h-[200px] overflow-y-auto space-y-2">
            {selectedItems.map((item) => (
              <div key={item.menu_item_id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.menu_item_id, -1)}
                    className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-300"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.menu_item_id, 1)}
                    className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200"
                  >
                    +
                  </button>
                </div>
                <Input
                  placeholder="Notes"
                  value={item.notes}
                  onChange={(e) => updateNotes(item.menu_item_id, e.target.value)}
                  className="w-28 text-xs min-h-[36px] py-1"
                />
                <span className="text-sm font-semibold text-gray-900 w-20 text-right">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="font-semibold text-gray-700">Subtotal</span>
            <span className="font-bold text-lg text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={selectedItems.length === 0 || loading}
          className="flex-1"
        >
          {loading ? "Adding..." : `Add Order (${formatCurrency(subtotal)})`}
        </Button>
      </div>
    </div>
  );
}
