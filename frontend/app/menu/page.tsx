"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { MenuCategory, MenuItem } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, cn } from "@/lib/utils";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

export default function MenuManagementPage() {
  const { token } = useAuthStore();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catOrder, setCatOrder] = useState(0);
  const [catActive, setCatActive] = useState(true);

  const [itemModal, setItemModal] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState(0);
  const [itemCategory, setItemCategory] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemTaxType, setItemTaxType] = useState("STANDARD");
  const [itemAvailable, setItemAvailable] = useState(true);
  const [itemOrder, setItemOrder] = useState(0);

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    try {
      const [cats, items] = await Promise.all([
        api.getCategories(token),
        api.getMenuItems(token),
      ]);
      setCategories(cats);
      setMenuItems(items);
      if (cats.length > 0 && !itemCategory) {
        setItemCategory(cats[0].id);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const openCatModal = (cat?: MenuCategory) => {
    if (cat) {
      setEditCat(cat);
      setCatName(cat.name);
      setCatOrder(cat.sort_order);
      setCatActive(cat.active);
    } else {
      setEditCat(null);
      setCatName("");
      setCatOrder(categories.length);
      setCatActive(true);
    }
    setCatModal(true);
  };

  const saveCat = async () => {
    if (!token) return;
    try {
      if (editCat) {
        await api.updateCategory(editCat.id, { name: catName, sort_order: catOrder, active: catActive }, token);
      } else {
        await api.createCategory({ name: catName, sort_order: catOrder, active: catActive }, token);
      }
      await loadData();
      setCatModal(false);
    } catch {
      // handle error
    }
  };

  const openItemModal = (item?: MenuItem) => {
    if (item) {
      setEditItem(item);
      setItemName(item.name);
      setItemPrice(item.price);
      setItemCategory(item.category_id);
      setItemDescription(item.description || "");
      setItemTaxType(item.tax_type);
      setItemAvailable(item.available);
      setItemOrder(item.sort_order);
    } else {
      setEditItem(null);
      setItemName("");
      setItemPrice(0);
      setItemCategory(categories[0]?.id || "");
      setItemDescription("");
      setItemTaxType("STANDARD");
      setItemAvailable(true);
      setItemOrder(menuItems.length);
    }
    setItemModal(true);
  };

  const saveItem = async () => {
    if (!token) return;
    try {
      const data = {
        name: itemName,
        price: itemPrice,
        category_id: itemCategory,
        description: itemDescription || undefined,
        tax_type: itemTaxType as "STANDARD" | "REDUCED",
        available: itemAvailable,
        sort_order: itemOrder,
      };
      if (editItem) {
        await api.updateMenuItem(editItem.id, data, token);
      } else {
        await api.createMenuItem(data, token);
      }
      await loadData();
      setItemModal(false);
    } catch {
      // handle error
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    if (!token) return;
    try {
      await api.updateMenuItem(item.id, { available: !item.available }, token);
      await loadData();
    } catch {
      // handle error
    }
  };

  const filteredItems =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((i) => i.category_id === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Menu Management"
        subtitle={`${categories.length} categories, ${menuItems.length} items`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCatModal()}>
              + Category
            </Button>
            <Button onClick={() => openItemModal()}>
              + Item
            </Button>
          </div>
        }
      />

      <div className="flex gap-6">
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-700">Categories</h3>
            </div>
            <div className="p-1">
              <button
                onClick={() => setSelectedCategory("all")}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm min-h-[44px] transition-colors",
                  selectedCategory === "all"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                All Items
              </button>
              {categories
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((cat) => (
                  <div key={cat.id} className="flex items-center group">
                    <button
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "flex-1 text-left px-3 py-2 rounded-lg text-sm min-h-[44px] transition-colors",
                        selectedCategory === cat.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50",
                        !cat.active && "opacity-50"
                      )}
                    >
                      {cat.name}
                      {!cat.active && <span className="text-xs text-gray-400 ml-1">(hidden)</span>}
                    </button>
                    <button
                      onClick={() => openCatModal(cat)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "bg-white rounded-xl border border-gray-200 p-4 transition-all hover:shadow-md",
                    !item.available && "opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        {categories.find((c) => c.id === item.category_id)?.name}
                      </p>
                    </div>
                    <button
                      onClick={() => openItemModal(item)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-400 mb-2 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-bold text-blue-600">{formatCurrency(item.price)}</span>
                    <button
                      onClick={() => toggleAvailability(item)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium min-h-[32px]",
                        item.available
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {item.available ? "Available" : "Unavailable"}
                    </button>
                  </div>
                </div>
              ))}
            {filteredItems.length === 0 && (
              <p className="col-span-full text-center text-gray-400 py-12">No items found</p>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title={editCat ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <Input
            id="catName"
            label="Name"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Category name"
          />
          <Input
            id="catOrder"
            label="Sort Order"
            type="number"
            value={catOrder}
            onChange={(e) => setCatOrder(Number(e.target.value))}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={catActive}
              onChange={(e) => setCatActive(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setCatModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={saveCat} disabled={!catName} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={itemModal} onClose={() => setItemModal(false)} title={editItem ? "Edit Item" : "Add Item"}>
        <div className="space-y-4">
          <Input
            id="itemName"
            label="Name"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Item name"
          />
          <Input
            id="itemPrice"
            label="Price"
            type="number"
            min={0}
            value={itemPrice}
            onChange={(e) => setItemPrice(Number(e.target.value))}
          />
          <Select
            id="itemCategory"
            label="Category"
            value={itemCategory}
            onChange={(e) => setItemCategory(e.target.value)}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            id="itemDesc"
            label="Description"
            value={itemDescription}
            onChange={(e) => setItemDescription(e.target.value)}
            placeholder="Optional description"
          />
          <Select
            id="itemTax"
            label="Tax Type"
            value={itemTaxType}
            onChange={(e) => setItemTaxType(e.target.value)}
            options={[
              { value: "STANDARD", label: "Standard (10%)" },
              { value: "REDUCED", label: "Reduced (8%)" },
            ]}
          />
          <Input
            id="itemOrder"
            label="Sort Order"
            type="number"
            value={itemOrder}
            onChange={(e) => setItemOrder(Number(e.target.value))}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={itemAvailable}
              onChange={(e) => setItemAvailable(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Available</span>
          </label>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setItemModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={saveItem} disabled={!itemName || !itemPrice} className="flex-1">
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
