"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Order } from "@/lib/types";

export default function InvoicePageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-12">Loading...</div>}>
      <InvoicePage />
    </Suspense>
  );
}

function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get<Order>(`/orders/${id}`, token)
      .then(setOrder)
      .catch((e) => setError(e?.message || "Couldn't load this order"))
      .finally(() => setLoading(false));
  }, [id, token, authLoading, router]);

  if (authLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12">Loading...</div>;
  }

  if (error || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-red-600">{error ?? "Order not found"}</p>
      </div>
    );
  }

  const total = order.items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  return (
    <div className="max-w-xl mx-auto px-5 py-10 print:px-0 print:py-0">
      <div className="flex justify-between items-center mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
        >
          ← Back
        </button>
        <button
          onClick={() => window.print()}
          className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)]"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="bg-white rounded-[var(--radius-card)] shadow-card p-8 print:shadow-none print:rounded-none">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-icon.png"
              alt="Muktagacha"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="font-display font-semibold text-[var(--color-ink-900)]">
                Muktagacha
              </p>
              <p className="text-xs text-[var(--color-ink-500)]">Local marketplace</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold text-[var(--color-ink-900)]">
              Receipt
            </p>
            <p className="text-xs text-[var(--color-ink-500)]">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <p className="text-xs text-[var(--color-ink-500)] mb-1">Sold by</p>
            <p className="font-medium text-[var(--color-ink-900)]">
              {order.organization?.name}
            </p>
            <p className="text-[var(--color-ink-500)]">
              {order.organization?.area} {order.organization?.ward ? `· ${order.organization.ward}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--color-ink-500)] mb-1">Billed to</p>
            <p className="font-medium text-[var(--color-ink-900)]">{order.buyer?.fullName}</p>
            <p className="text-[var(--color-ink-500)]">{order.buyer?.phone}</p>
          </div>
        </div>

        <div className="flex justify-between text-xs text-[var(--color-ink-500)] mb-6 pb-4 border-b border-[var(--color-border)]">
          <span>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
          <span>Status: {order.status.replace(/_/g, " ")}</span>
        </div>

        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="text-left text-[var(--color-ink-500)] border-b border-[var(--color-border)]">
              <th className="pb-2 font-medium">Item</th>
              <th className="pb-2 font-medium text-center">Qty</th>
              <th className="pb-2 font-medium text-right">Price</th>
              <th className="pb-2 font-medium text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-[var(--color-border)]">
                <td className="py-2 text-[var(--color-ink-900)]">
                  {item.product?.name ?? "Item"}
                  {item.variant?.optionValues && (
                    <span className="text-xs text-[var(--color-ink-500)] block">
                      {Object.values(item.variant.optionValues).join(" / ")}
                    </span>
                  )}
                </td>
                <td className="py-2 text-center text-[var(--color-ink-500)]">
                  {item.quantity}
                </td>
                <td className="py-2 text-right text-[var(--color-ink-500)]">৳{item.price}</td>
                <td className="py-2 text-right text-[var(--color-ink-900)] font-medium">
                  ৳{(Number(item.price) * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-48 text-sm">
            <div className="flex justify-between font-display text-lg font-semibold text-[var(--color-ink-900)] pt-2 border-t border-[var(--color-border)]">
              <span>Total</span>
              <span>৳{total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-[var(--color-ink-500)] space-y-1 pt-4 border-t border-[var(--color-border)]">
          <p>
            Payment method: {order.paymentMethod.replace(/_/g, " ")}
            {order.paymentMethod !== "CASH_ON_DELIVERY" && order.paymentTrxId && (
              <> · TrxID: {order.paymentTrxId}</>
            )}
          </p>
          {order.rider && (
            <p>Delivered by: {order.rider.fullName} ({order.rider.phone})</p>
          )}
          <p className="pt-2">Thank you for shopping with us.</p>
        </div>
      </div>
    </div>
  );
}
