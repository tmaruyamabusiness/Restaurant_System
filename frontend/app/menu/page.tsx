"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { api } from "@/lib/api";
import { cn, formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { withToast } from "@/stores/toastStore";
import { MenuCategoryResponse, MenuItemResponse, TaxType } from "@/types";

interface ItemForm {
  id?: string;
  category_id: string;
  name: string;
  price: number;
  tax_type: TaxType;
  is_available: boolean;
}

export default function MenuPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [categories, setCategories] = useState<MenuCategoryResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [categoryModal, setCategoryModal] = useState<{ id?: string; name: string } | null>(null);
  const [itemModal, setItemModal] = useState<ItemForm | null>(null);
  const [saving, setSaving] = useState(false);

  const canEdit = user?.role === "OWNER" || user?.role === "MANAGER";

  const load = useCallback(async () => {
    const cats = await withToast(() => api.getMenu(true));
    if (cats) {
      setCategories(cats);
      setSelectedCategory((prev) => prev || cats[0]?.id || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const current = useMemo(
    () => categories.find((c) => c.id === selectedCategory),
    [categories, selectedCategory]
  );

  const saveCategory = async () => {
    if (!categoryModal) return;
    setSaving(true);
    const result = categoryModal.id
      ? await withToast(
          () => api.updateCategory(categoryModal.id!, { name: categoryModal.name }),
          "カテゴリを更新しました"
        )
      : await withToast(
          () => api.createCategory({ name: categoryModal.name, sort_order: categories.length, is_active: true }),
          "カテゴリを追加しました"
        );
    setSaving(false);
    if (result) {
      setCategoryModal(null);
      await load();
    }
  };

  const saveItem = async () => {
    if (!itemModal) return;
    setSaving(true);
    const body = {
      category_id: itemModal.category_id,
      name: itemModal.name,
      price: itemModal.price,
      tax_type: itemModal.tax_type,
      is_available: itemModal.is_available,
    };
    const result = itemModal.id
      ? await withToast(() => api.updateMenuItem(itemModal.id!, body), "商品を更新しました")
      : await withToast(
          () => api.createMenuItem({ ...body, sort_order: current?.items?.length ?? 0 }),
          "商品を追加しました"
        );
    setSaving(false);
    if (result) {
      setItemModal(null);
      await load();
    }
  };

  const toggleAvailability = async (item: MenuItemResponse) => {
    const result = await withToast(
      () => api.updateMenuItem(item.id, { is_available: !item.is_available }),
      item.is_available ? `「${item.name}」を提供停止にしました` : `「${item.name}」を提供再開しました`
    );
    if (result) await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="メニュー管理"
        subtitle={`${categories.length}カテゴリ・${categories.reduce((s, c) => s + (c.items?.length ?? 0), 0)}商品`}
        actions={
          canEdit && (
            <Button onClick={() => setCategoryModal({ name: "" })} variant="outline">
              + カテゴリ追加
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "min-h-[42px] rounded-lg border px-4 text-[13px]",
              selectedCategory === cat.id
                ? "border-blue-600 bg-blue-600 font-bold text-white"
                : "border-gray-200 bg-white text-gray-600",
              !cat.is_active && "opacity-50"
            )}
          >
            {cat.name}
            <span className="ml-1.5 text-[11px] opacity-70">{cat.items?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {current && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{current.name}</h3>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCategoryModal({ id: current.id, name: current.name })}
                >
                  カテゴリ名を変更
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setItemModal({
                      category_id: current.id,
                      name: "",
                      price: 0,
                      tax_type: "REDUCED_8",
                      is_available: true,
                    })
                  }
                >
                  + 商品追加
                </Button>
              </div>
            )}
          </div>
          {(current.items ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">商品がありません</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {(current.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold text-gray-900",
                        !item.is_available && "text-gray-400 line-through"
                      )}
                    >
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.tax_type === "STANDARD_10" ? "標準税率 10%" : "軽減税率 8%"}
                    </p>
                  </div>
                  <b className="text-sm text-gray-900">{formatCurrency(item.price)}</b>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={cn(
                          "min-h-[34px] rounded-full px-3 text-xs font-bold",
                          item.is_available
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        )}
                      >
                        {item.is_available ? "提供中" : "停止中"}
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setItemModal({
                            id: item.id,
                            category_id: item.category_id,
                            name: item.name,
                            price: item.price,
                            tax_type: item.tax_type,
                            is_available: item.is_available,
                          })
                        }
                      >
                        編集
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={!!categoryModal}
        onClose={() => setCategoryModal(null)}
        title={categoryModal?.id ? "カテゴリ名の変更" : "カテゴリ追加"}
      >
        {categoryModal && (
          <div className="space-y-4">
            <Input
              label="カテゴリ名"
              value={categoryModal.name}
              onChange={(e) => setCategoryModal({ ...categoryModal, name: e.target.value })}
            />
            <Button
              className="w-full"
              disabled={saving || !categoryModal.name.trim()}
              onClick={saveCategory}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!itemModal}
        onClose={() => setItemModal(null)}
        title={itemModal?.id ? "商品の編集" : "商品追加"}
      >
        {itemModal && (
          <div className="space-y-4">
            <Input
              label="商品名"
              value={itemModal.name}
              onChange={(e) => setItemModal({ ...itemModal, name: e.target.value })}
            />
            <Input
              label="価格（税抜・円)"
              type="number"
              min={0}
              value={itemModal.price || ""}
              onChange={(e) =>
                setItemModal({ ...itemModal, price: Math.max(0, Number(e.target.value)) })
              }
            />
            <Select
              label="税区分"
              value={itemModal.tax_type}
              options={[
                { value: "REDUCED_8", label: "軽減税率 8%（食品）" },
                { value: "STANDARD_10", label: "標準税率 10%（酒類など）" },
              ]}
              onChange={(e) =>
                setItemModal({ ...itemModal, tax_type: e.target.value as TaxType })
              }
            />
            <Select
              label="カテゴリ"
              value={itemModal.category_id}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(e) => setItemModal({ ...itemModal, category_id: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={itemModal.is_available}
                onChange={(e) => setItemModal({ ...itemModal, is_available: e.target.checked })}
                className="rounded border-gray-300"
              />
              提供中にする
            </label>
            <Button
              className="w-full"
              disabled={saving || !itemModal.name.trim() || itemModal.price <= 0}
              onClick={saveItem}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
