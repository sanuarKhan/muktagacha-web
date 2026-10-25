"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  NOT_SUBMITTED: "",
  PENDING_VERIFICATION: "Payment pending vendor confirmation",
  VERIFIED: "Payment confirmed",
  REJECTED: "Payment rejected — contact vendor",
};

export default function OrdersPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [rated, setRated] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get<Order[]>("/orders/mine", token)
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  async function rate(orderId: string, rating: number) {
    if (!token) return;
    await api.post(`/riders/orders/${orderId}/rate`, { rating }, token);
    setRated((prev) => ({ ...prev, [orderId]: true }));
  }

  if (authLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] mb-6">My Orders</h1>
      {orders.length === 0 && (
        <p className="text-[var(--color-ink-500)]">You haven't placed any orders yet.</p>
      )}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-[var(--radius-card)] shadow-card p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold">
                  {order.organization?.name ?? "Vendor"}
                </p>
                <p className="text-xs text-[var(--color-ink-300)]">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  STATUS_COLORS[order.status] ?? "bg-neutral-100"
                }`}
              >
                {order.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-sm text-[var(--color-ink-700)]">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>Qty {item.quantity}</span>
                  <span>৳{item.price}</span>
                </div>
              ))}
            </div>
            <Link
              href={`/orders/${order.id}`}
              className="text-xs text-[var(--color-emerald-700)] font-medium hover:underline mt-2 inline-block"
            >
              View receipt →
            </Link>
            {PAYMENT_STATUS_LABEL[order.paymentVerification] && (
              <p className="text-xs text-[var(--color-ink-500)] mt-2 pt-2 border-t border-[var(--color-border)]">
                {PAYMENT_STATUS_LABEL[order.paymentVerification]}
              </p>
            )}
            {order.status === "COMPLETED" && order.riderId && !rated[order.id] && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center gap-1">
                <span className="text-xs text-[var(--color-ink-500)] mr-1">
                  Rate your delivery:
                </span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => rate(order.id, n)}
                    className="text-lg text-[var(--color-gold-600)] hover:scale-110 transition-transform"
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
            {rated[order.id] && (
              <p className="text-xs text-[var(--color-emerald-700)] mt-2 pt-2 border-t border-[var(--color-border)]">
                Thanks for rating your delivery!
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
