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
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-neutral-500">Your cart is empty.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Checkout</h1>

      {Object.entries(grouped).map(([orgId, groupLines]) => (
        <div
          key={orgId}
          className="bg-white border border-neutral-200 rounded-lg p-4 mb-4"
        >
          <h3 className="font-semibold text-sm text-neutral-500 mb-2">
            {groupLines[0].listing.organization?.name ?? "Vendor"}
          </h3>
          {groupLines.map((l) => (
            <div
              key={l.listing.id}
              className="flex justify-between text-sm py-1"
            >
              <span>
                {l.listing.name} × {l.quantity}
              </span>
              <span>৳{Number(l.listing.price ?? 0) * l.quantity}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="flex justify-between font-bold text-lg mb-6">
        <span>Total</span>
        <span>৳{total}</span>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Payment method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
          className="w-full border border-neutral-300 rounded-md px-3 py-2"
        >
          <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
          <option value="BKASH">bKash (pay vendor directly)</option>
          <option value="NAGAD">Nagad (pay vendor directly)</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <button
        onClick={placeOrders}
        disabled={submitting}
        className="w-full bg-emerald-600 text-white rounded-md py-2.5 font-medium hover:bg-emerald-700 disabled:opacity-50"
      >
        {submitting ? "Placing order..." : "Place Order"}
      </button>
    </div>
  );
}
