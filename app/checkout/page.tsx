"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Order, PaymentMethod } from "@/lib/types";

export default function CheckoutPage() {
  const { lines, linesByOrganization, clear } = useCart();
  const { user, token } = useAuth();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    "CASH_ON_DELIVERY",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grouped = linesByOrganization();
  const total = lines.reduce(
    (sum, l) => sum + Number(l.listing.price ?? 0) * l.quantity,
    0,
  );

  async function placeOrders() {
    if (!user || !token) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // One order per vendor — each vendor fulfills their own sub-order
      // independently, matching the multi-vendor cart design from the plan.
      for (const [organizationId, groupLines] of Object.entries(grouped)) {
        await api.post<Order>(
          "/orders",
          {
            organizationId,
            paymentMethod,
            items: groupLines.map((l) => ({
              listingId: l.listing.id,
              quantity: l.quantity,
              price: Number(l.listing.price ?? 0),
            })),
          },
          token,
        );
      }
      clear();
      router.push("/orders");
    } catch (err: any) {
      setError(err?.message ?? "Could not place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--color-cream-100)]">
        <p className="text-[var(--color-ink-500)]">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)] px-5 py-10">
      <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] mb-6">Checkout</h1>

      {Object.entries(grouped).map(([orgId, groupLines]) => (
        <div
          key={orgId}
          className="bg-white rounded-[var(--radius-card)] shadow-card p-5 mb-4"
        >
          <h3 className="font-semibold text-sm text-[var(--color-ink-500)] mb-2">
            {groupLines[0].listing.organization?.name ?? "Vendor"}
          </h3>
          {groupLines.map((l) => (
            <div
              key={l.listing.id}
              className="flex justify-between text-sm py-1 text-[var(--color-ink-700)]"
            >
              <span>
                {l.listing.name} × {l.quantity}
              </span>
              <span>৳{Number(l.listing.price ?? 0) * l.quantity}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-between font-display font-semibold text-xl mb-6 text-[var(--color-ink-900)]">
        <span>Total</span>
        <span>৳{total}</span>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-2">
          Payment method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 bg-white text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
        >
          <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
          <option value="BKASH">bKash (pay vendor directly)</option>
          <option value="NAGAD">Nagad (pay vendor directly)</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        onClick={placeOrders}
        disabled={submitting}
        className="w-full bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] rounded-[var(--radius-pill)] py-3 font-medium hover:bg-[var(--color-emerald-900)] transition-colors disabled:opacity-50"
      >
        {submitting ? "Placing order..." : "Place Order"}
      </button>
      </div>
    </div>
  );
}
