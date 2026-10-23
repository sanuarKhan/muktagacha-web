"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function OrdersPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (authLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">My Orders</h1>
      {orders.length === 0 && (
        <p className="text-neutral-500">You haven't placed any orders yet.</p>
      )}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white border border-neutral-200 rounded-lg p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold">
                  {order.organization?.name ?? "Vendor"}
                </p>
                <p className="text-xs text-neutral-400">
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
            <div className="text-sm text-neutral-600">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>Qty {item.quantity}</span>
                  <span>৳{item.price}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
