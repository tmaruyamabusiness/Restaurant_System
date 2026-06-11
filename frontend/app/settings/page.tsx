"use client";

import { useCallback, useEffect, useState } from "react";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { api } from "@/lib/api";
import { cn, getSeatTypeLabel, getStatusLabel } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { withToast } from "@/stores/toastStore";
import { SeatResponse, SeatType, UserResponse, UserRole } from "@/types";

type Tab = "store" | "seats" | "users";

interface UserForm {
  id?: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  is_active: boolean;
}

export default function SettingsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("store");

  // ---- 店舗設定 ----
  const [storeName, setStoreName] = useState("");
  const [alertThreshold, setAlertThreshold] = useState(60);
  const [savingStore, setSavingStore] = useState(false);

  // ---- 席 ----
  const [seats, setSeats] = useState<SeatResponse[]>([]);
  const [seatModal, setSeatModal] = useState<{
    seat_number: string;
    seat_type: SeatType;
    capacity: number;
  } | null>(null);

  // ---- ユーザー ----
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [userModal, setUserModal] = useState<UserForm | null>(null);
  const [saving, setSaving] = useState(false);

  const isOwner = user?.role === "OWNER";
  const canManage = isOwner || user?.role === "MANAGER";

  const load = useCallback(async () => {
    const settings = await withToast(() => api.getSettings());
    if (settings) {
      setStoreName(settings.store_name);
      setAlertThreshold(settings.alert_threshold_minutes);
    }
    const seatList = await withToast(() => api.getSeats());
    if (seatList) setSeats(seatList);
    if (canManage) {
      const userList = await withToast(() => api.getUsers());
      if (userList) setUsers(userList);
    }
  }, [canManage]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const saveStore = async () => {
    setSavingStore(true);
    await withToast(
      () =>
        api.updateSettings({
          store_name: storeName,
          alert_threshold_minutes: alertThreshold,
        }),
      "店舗設定を保存しました"
    );
    setSavingStore(false);
  };

  const saveSeat = async () => {
    if (!seatModal) return;
    setSaving(true);
    const created = await withToast(
      () =>
        api.createSeat({
          seat_number: seatModal.seat_number,
          seat_type: seatModal.seat_type,
          capacity: seatModal.capacity,
          sort_order: seats.length,
        }),
      `席 #${seatModal.seat_number} を追加しました`
    );
    setSaving(false);
    if (created) {
      setSeatModal(null);
      await load();
    }
  };

  const saveUser = async () => {
    if (!userModal) return;
    setSaving(true);
    const result = userModal.id
      ? await withToast(
          () =>
            api.updateUser(userModal.id!, {
              username: userModal.username,
              email: userModal.email,
              role: userModal.role,
              is_active: userModal.is_active,
              password: userModal.password || undefined,
            }),
          "ユーザーを更新しました"
        )
      : await withToast(
          () =>
            api.createUser({
              username: userModal.username,
              email: userModal.email,
              password: userModal.password,
              role: userModal.role,
            }),
          "スタッフを追加しました"
        );
    setSaving(false);
    if (result) {
      setUserModal(null);
      await load();
    }
  };

  const TABS: { key: Tab; label: string; show: boolean }[] = [
    { key: "store", label: "店舗設定", show: true },
    { key: "seats", label: "席管理", show: canManage },
    { key: "users", label: "スタッフ管理", show: canManage },
  ];

  return (
    <div>
      <Header title="設定" />

      <div className="mb-5 flex gap-2">
        {TABS.filter((t) => t.show).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "min-h-[42px] rounded-lg border px-4 text-sm",
              tab === t.key
                ? "border-slate-900 bg-slate-900 font-bold text-white"
                : "border-gray-300 bg-white text-gray-600"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "store" && (
        <div className="max-w-lg space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <Input
            label="店舗名"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            disabled={!canManage}
          />
          <Input
            label="長時間滞在アラート（分）"
            type="number"
            min={1}
            max={600}
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(Math.max(1, Number(e.target.value)))}
            disabled={!canManage}
          />
          <p className="text-xs text-gray-400">
            フロアマップで滞在時間がこの分数を超えた席に赤いアラートを表示します
          </p>
          {canManage && (
            <Button onClick={saveStore} disabled={savingStore} className="w-full">
              {savingStore ? "保存中..." : "保存"}
            </Button>
          )}
        </div>
      )}

      {tab === "seats" && (
        <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">席一覧（{seats.length}席）</h3>
            <Button
              size="sm"
              onClick={() => setSeatModal({ seat_number: "", seat_type: "TABLE", capacity: 4 })}
            >
              + 席を追加
            </Button>
          </div>
          <div className="divide-y divide-gray-50">
            {[...seats]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((s) => (
                <div key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <b className="w-14 text-gray-900">#{s.seat_number}</b>
                  <span className="flex-1 text-gray-600">{getSeatTypeLabel(s.seat_type)}</span>
                  <span className="text-gray-500">定員 {s.capacity}名</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">スタッフ一覧</h3>
            {isOwner && (
              <Button
                size="sm"
                onClick={() =>
                  setUserModal({
                    username: "",
                    email: "",
                    password: "",
                    role: "STAFF",
                    is_active: true,
                  })
                }
              >
                + スタッフ追加
              </Button>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold text-gray-900", !u.is_active && "text-gray-400")}>
                    {u.username}
                    {!u.is_active && <span className="ml-2 text-xs">(無効)</span>}
                  </p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                  {getStatusLabel(u.role)}
                </span>
                {isOwner && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setUserModal({
                        id: u.id,
                        username: u.username,
                        email: u.email,
                        password: "",
                        role: u.role,
                        is_active: u.is_active,
                      })
                    }
                  >
                    編集
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={!!seatModal} onClose={() => setSeatModal(null)} title="席を追加">
        {seatModal && (
          <div className="space-y-4">
            <Input
              label="席番号"
              value={seatModal.seat_number}
              onChange={(e) => setSeatModal({ ...seatModal, seat_number: e.target.value })}
              placeholder="例: 6, C4, R3"
            />
            <Select
              label="席タイプ"
              value={seatModal.seat_type}
              options={[
                { value: "TABLE", label: "テーブル" },
                { value: "COUNTER", label: "カウンター" },
                { value: "PRIVATE", label: "個室" },
              ]}
              onChange={(e) => setSeatModal({ ...seatModal, seat_type: e.target.value as SeatType })}
            />
            <Input
              label="定員"
              type="number"
              min={1}
              max={50}
              value={seatModal.capacity}
              onChange={(e) =>
                setSeatModal({ ...seatModal, capacity: Math.max(1, Number(e.target.value)) })
              }
            />
            <Button
              className="w-full"
              disabled={saving || !seatModal.seat_number.trim()}
              onClick={saveSeat}
            >
              {saving ? "保存中..." : "追加"}
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!userModal}
        onClose={() => setUserModal(null)}
        title={userModal?.id ? "スタッフの編集" : "スタッフ追加"}
      >
        {userModal && (
          <div className="space-y-4">
            <Input
              label="名前"
              value={userModal.username}
              onChange={(e) => setUserModal({ ...userModal, username: e.target.value })}
            />
            <Input
              label="メールアドレス"
              type="email"
              value={userModal.email}
              onChange={(e) => setUserModal({ ...userModal, email: e.target.value })}
            />
            <Input
              label={userModal.id ? "新しいパスワード（変更時のみ）" : "パスワード（8文字以上）"}
              type="password"
              value={userModal.password}
              onChange={(e) => setUserModal({ ...userModal, password: e.target.value })}
            />
            <Select
              label="権限"
              value={userModal.role}
              options={[
                { value: "STAFF", label: "スタッフ" },
                { value: "MANAGER", label: "マネージャー" },
                { value: "OWNER", label: "オーナー" },
              ]}
              onChange={(e) => setUserModal({ ...userModal, role: e.target.value as UserRole })}
            />
            {userModal.id && (
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={userModal.is_active}
                  onChange={(e) => setUserModal({ ...userModal, is_active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                有効なアカウント
              </label>
            )}
            <Button
              className="w-full"
              disabled={
                saving ||
                !userModal.username.trim() ||
                !userModal.email.trim() ||
                (!userModal.id && userModal.password.length < 8)
              }
              onClick={saveUser}
            >
              {saving ? "保存中..." : "保存"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
