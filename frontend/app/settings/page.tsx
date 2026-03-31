"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useSeatStore } from "@/stores/seatStore";
import { Seat, User, UserRole, SeatType } from "@/types";
import { api } from "@/lib/api";
import { getSeatTypeLabel, cn } from "@/lib/utils";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";

export default function SettingsPage() {
  const { token, user: currentUser } = useAuthStore();
  const { seats, fetchSeats, alertThreshold, setAlertThreshold } = useSeatStore();
  const [users, setUsers] = useState<User[]>([]);
  const [thresholdInput, setThresholdInput] = useState(alertThreshold);
  const [loading, setLoading] = useState(true);

  const [seatModal, setSeatModal] = useState(false);
  const [editSeat, setEditSeat] = useState<Seat | null>(null);
  const [seatNumber, setSeatNumber] = useState("");
  const [seatType, setSeatType] = useState<SeatType>("COUNTER");
  const [seatCapacity, setSeatCapacity] = useState(1);
  const [seatOrder, setSeatOrder] = useState(0);

  const [userModal, setUserModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("STAFF");

  const isOwner = currentUser?.role === "OWNER";

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        await fetchSeats(token);
        if (isOwner) {
          const u = await api.getUsers(token);
          setUsers(u);
        }
        const settings = await api.getSettings(token);
        setThresholdInput(settings.alert_threshold_minutes);
        setAlertThreshold(settings.alert_threshold_minutes);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, isOwner, fetchSeats, setAlertThreshold]);

  const saveThreshold = async () => {
    if (!token) return;
    try {
      await api.updateSettings({ alert_threshold_minutes: thresholdInput }, token);
      setAlertThreshold(thresholdInput);
    } catch {
      // handle error
    }
  };

  const openSeatModal = (seat?: Seat) => {
    if (seat) {
      setEditSeat(seat);
      setSeatNumber(seat.number);
      setSeatType(seat.type);
      setSeatCapacity(seat.capacity);
      setSeatOrder(seat.sort_order);
    } else {
      setEditSeat(null);
      setSeatNumber(`S${seats.length + 1}`);
      setSeatType("COUNTER");
      setSeatCapacity(1);
      setSeatOrder(seats.length);
    }
    setSeatModal(true);
  };

  const saveSeat = async () => {
    if (!token) return;
    try {
      if (editSeat) {
        await api.updateSeat(
          editSeat.id,
          { seat_number: seatNumber, seat_type: seatType, capacity: seatCapacity, sort_order: seatOrder },
          token
        );
      } else {
        await api.createSeat(
          { number: seatNumber, type: seatType as string, capacity: seatCapacity, sort_order: seatOrder },
          token
        );
      }
      await fetchSeats(token);
      setSeatModal(false);
    } catch {
      // handle error
    }
  };

  const openUserModal = (user?: User) => {
    if (user) {
      setEditUser(user);
      setUserName(user.name);
      setUserEmail(user.email);
      setUserPassword("");
      setUserRole(user.role);
    } else {
      setEditUser(null);
      setUserName("");
      setUserEmail("");
      setUserPassword("");
      setUserRole("STAFF");
    }
    setUserModal(true);
  };

  const saveUser = async () => {
    if (!token) return;
    try {
      if (editUser) {
        const data: any = { name: userName, email: userEmail, role: userRole };
        if (userPassword) data.password = userPassword;
        await api.updateUser(editUser.id, data, token);
      } else {
        await api.createUser(
          { name: userName, email: userEmail, password: userPassword, role: userRole },
          token
        );
      }
      const u = await api.getUsers(token);
      setUsers(u);
      setUserModal(false);
    } catch {
      // handle error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <Header title="設定" />

      <div className="max-w-3xl space-y-8">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">アラートしきい値</h3>
          <p className="text-sm text-gray-500 mb-3">
            指定時間以上着席している席をハイライト表示します。
          </p>
          <div className="flex gap-3 items-end">
            <Input
              id="threshold"
              label="分"
              type="number"
              min={1}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(Number(e.target.value))}
              className="w-32"
            />
            <Button onClick={saveThreshold}>保存</Button>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">席管理</h3>
            <Button size="sm" onClick={() => openSeatModal()}>
              + 席を追加
            </Button>
          </div>
          <div className="space-y-2">
            {seats
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((seat) => (
                <div
                  key={seat.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-900 w-12">#{seat.number}</span>
                    <span className="text-sm text-gray-600">{getSeatTypeLabel(seat.type)}</span>
                    <span className="text-sm text-gray-500">定員: {seat.capacity}</span>
                    <span className="text-xs text-gray-400">並び順: {seat.sort_order}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openSeatModal(seat)}>
                    編集
                  </Button>
                </div>
              ))}
            {seats.length === 0 && (
              <p className="text-center text-gray-400 py-4">席が未設定です</p>
            )}
          </div>
        </section>

        {isOwner && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">スタッフ管理</h3>
              <Button size="sm" onClick={() => openUserModal()}>
                + スタッフ追加
              </Button>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        u.role === "OWNER"
                          ? "bg-purple-100 text-purple-700"
                          : u.role === "MANAGER"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {u.role}
                    </span>
                    {!u.active && (
                      <span className="text-xs text-red-500">無効</span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openUserModal(u)}>
                    編集
                  </Button>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-center text-gray-400 py-4">スタッフがいません</p>
              )}
            </div>
          </section>
        )}
      </div>

      <Modal isOpen={seatModal} onClose={() => setSeatModal(false)} title={editSeat ? "席を編集" : "席を追加"}>
        <div className="space-y-4">
          <Input
            id="seatNum"
            label="席番号"
            type="text"
            value={seatNumber}
            onChange={(e) => setSeatNumber(e.target.value)}
          />
          <Select
            id="seatType"
            label="種別"
            value={seatType}
            onChange={(e) => {
              const t = e.target.value as SeatType;
              setSeatType(t);
              if (t === "COUNTER") setSeatCapacity(1);
              else if (t === "TABLE_2") setSeatCapacity(2);
              else setSeatCapacity(4);
            }}
            options={[
              { value: "COUNTER", label: "カウンター" },
              { value: "TABLE_2", label: "2人テーブル" },
              { value: "TABLE_4", label: "4人テーブル" },
            ]}
          />
          <Input
            id="seatCap"
            label="定員"
            type="number"
            min={1}
            value={seatCapacity}
            onChange={(e) => setSeatCapacity(Number(e.target.value))}
          />
          <Input
            id="seatOrd"
            label="表示順"
            type="number"
            value={seatOrder}
            onChange={(e) => setSeatOrder(Number(e.target.value))}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSeatModal(false)} className="flex-1">
              キャンセル
            </Button>
            <Button onClick={saveSeat} className="flex-1">
              保存
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={userModal} onClose={() => setUserModal(false)} title={editUser ? "スタッフ編集" : "スタッフ追加"}>
        <div className="space-y-4">
          <Input
            id="uName"
            label="名前"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="氏名"
          />
          <Input
            id="uEmail"
            label="メールアドレス"
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="email@restaurant.com"
          />
          <Input
            id="uPass"
            label={editUser ? "新パスワード（変更しない場合は空欄）" : "パスワード"}
            type="password"
            value={userPassword}
            onChange={(e) => setUserPassword(e.target.value)}
            placeholder={editUser ? "変更しない場合は空欄" : "パスワード"}
          />
          <Select
            id="uRole"
            label="役割"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as UserRole)}
            options={[
              { value: "STAFF", label: "スタッフ" },
              { value: "MANAGER", label: "マネージャー" },
              { value: "OWNER", label: "オーナー" },
            ]}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setUserModal(false)} className="flex-1">
              キャンセル
            </Button>
            <Button
              onClick={saveUser}
              disabled={!userName || !userEmail || (!editUser && !userPassword)}
              className="flex-1"
            >
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
