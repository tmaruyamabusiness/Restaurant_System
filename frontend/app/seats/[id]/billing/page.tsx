"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useSeatStore } from "@/stores/seatStore";
import { Seat, Order } from "@/types";
import { api } from "@/lib/api";
import { formatCurrency, calculateTax } from "@/lib/utils";
import Header from "@/components/layout/Header";
import Button from "@/components/ui/Button";
import PaymentForm from "@/components/billing/PaymentForm";

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const seatId = params.id as string;
  const { token } = useAuthStore();
  const { updateSeat } = useSeatStore();
  const [seat, setSeat] = useState<Seat | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const data = await api.getSeat(seatId, token);
        setSeat(data);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [seatId, token]);

  const sessionOrders: Order[] = seat?.current_session?.orders || [];
  const subtotal = sessionOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const tax = sessionOrders.reduce((sum, o) => sum + o.tax, 0);
  const total = sessionOrders.reduce((sum, o) => sum + o.total, 0);

  const handlePayment = async (data: {
    payments: { method: string; amount: number; received_amount?: number }[];
    discount_amount?: number;
    discount_percentage?: number;
    print_receipt: boolean;
  }) => {
    if (!token || !seat?.current_session) return;
    setPaymentLoading(true);
    try {
      await api.createPayment(
        {
          session_id: seat.current_session.id,
          payments: data.payments,
          discount_amount: data.discount_amount,
          discount_percentage: data.discount_percentage,
          print_receipt: data.print_receipt,
        },
        token
      );

      const updated = await api.updateSeatStatus(seat.id, "CLEANING", undefined, token);
      setSeat(updated);
      updateSeat(updated);
      setPaymentComplete(true);
    } catch {
      // handle error
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!seat) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">席が見つかりません</p>
        <Button onClick={() => router.push("/")} className="mt-4">
          フロアマップに戻る
        </Button>
      </div>
    );
  }

  if (paymentComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">会計完了</h2>
        <p className="text-gray-500 mb-6">席 #{seat.number} は清掃待ちになりました。</p>
        <Button onClick={() => router.push("/")} size="lg">
          フロアマップに戻る
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={`会計 - 席 #${seat.number}`}
        actions={
          <Button variant="ghost" onClick={() => router.push(`/seats/${seat.id}`)}>
            席に戻る
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">注文内容</h3>
          <div className="space-y-3">
            {sessionOrders.map((order) => (
              <div key={order.id} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-900">{order.order_number}</span>
                  <span className="text-sm font-semibold">{formatCurrency(order.total)}</span>
                </div>
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-gray-600 py-0.5">
                    <span>
                      {item.menu_item_name} x{item.quantity}
                    </span>
                    <span>{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          {sessionOrders.length === 0 && (
            <p className="text-center text-gray-400 py-8">会計対象の注文がありません</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">お支払い</h3>
          <PaymentForm
            subtotal={subtotal}
            tax={tax}
            total={total}
            onSubmit={handlePayment}
            loading={paymentLoading}
          />
        </div>
      </div>
    </div>
  );
}
