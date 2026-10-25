"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Order, PaymentMethod, Organization } from "@/lib/types";

export default function CheckoutPage() {
  const { lines, linesByOrganization, clear } = useCart();
  const { user, token } = useAuth();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    "CASH_ON_DELIVERY",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trxIds, setTrxIds] = useState<Record<string, string>>({});
  const [vendorOrgs, setVendorOrgs] = useState<Record<string, Organization>>({});

  const grouped = linesByOrganization();
  const total = lines.reduce(
    (sum, l) =>
      sum +
      Number(l.variant?.priceOverride ?? l.product.basePrice) * l.quantity,
    0,
  );

  // Fetch each vendor's org (for bKash/Nagad numbers to show at checkout)
  useEffect(() => {
    Object.keys(grouped).forEach((orgId) => {
      const sample = grouped[orgId][0]?.product.organization;
      if (sample) {
        setVendorOrgs((prev) => ({ ...prev, [orgId]: sample }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function placeOrders() {
    if (!user || !token) {
      router.push("/login");
      return;
    }
    if (paymentMethod !== "CASH_ON_DELIVERY") {
      const missing = Object.keys(grouped).filter((orgId) => !trxIds[orgId]?.trim());
      if (missing.length > 0) {
        setError(
          "Please enter the transaction ID for each vendor after paying via bKash/Nagad.",
        );
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      // One order per vendor — each vendor fulfills their own sub-order
      // independently, matching the multi-vendor cart design from the plan.
      for (const [organizationId, groupLines] of Object.entries(grouped)) {
        const order = await api.post<Order>(
          "/orders",
          {
            organizationId,
            paymentMethod,
            items: groupLines.map((l) => ({
              productId: l.product.id,
              variantId: l.variant?.id,
              quantity: l.quantity,
            })),
          },
          token,
        );
        if (paymentMethod !== "CASH_ON_DELIVERY" && trxIds[organizationId]) {
          await api.post(
            `/orders/${order.id}/payment-proof`,
            { trxId: trxIds[organizationId] },
            token,
          );
        }
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
            {groupLines[0].product.organization?.name ?? "Vendor"}
          </h3>
          {groupLines.map((l) => (
            <div
              key={`${l.product.id}:${l.variant?.id ?? ""}`}
              className="flex justify-between text-sm py-1 text-[var(--color-ink-700)]"
            >
              <span>
                {l.product.name}
                {l.variant &&
                  ` (${Object.values(l.variant.optionValues).join(" / ")})`}{" "}
                × {l.quantity}
              </span>
              <span>
                ৳{Number(l.variant?.priceOverride ?? l.product.basePrice) * l.quantity}
              </span>
            </div>
          ))}

          {paymentMethod !== "CASH_ON_DELIVERY" && (
            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
              {(() => {
                const org = vendorOrgs[orgId];
                const number =
                  paymentMethod === "BKASH" ? org?.bkashNumber : org?.nagadNumber;
                if (!number) {
                  return (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      This vendor hasn't set up a {paymentMethod === "BKASH" ? "bKash" : "Nagad"} number
                      yet — please choose Cash on Delivery or contact them directly.
                    </p>
                  );
                }
                return (
                  <>
                    <p className="text-sm text-[var(--color-ink-700)] mb-2">
                      Send ৳
                      {groupLines.reduce(
                        (s, l) =>
                          s +
                          Number(l.variant?.priceOverride ?? l.product.basePrice) *
                            l.quantity,
                        0,
                      )}{" "}
                      to <strong>{number}</strong> ({paymentMethod === "BKASH" ? "bKash" : "Nagad"}),
                      then enter the transaction ID below.
                    </p>
                    <input
                      required
                      placeholder="Transaction ID (TrxID)"
                      value={trxIds[orgId] ?? ""}
                      onChange={(e) =>
                        setTrxIds({ ...trxIds, [orgId]: e.target.value })
                      }
                      className="w-full border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                    />
                  </>
                );
              })()}
            </div>
          )}
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
        {paymentMethod !== "CASH_ON_DELIVERY" && (
          <p className="text-xs text-[var(--color-ink-500)] mt-2">
            Muktagacha doesn't process payments itself — you pay the vendor's
            own bKash/Nagad number directly, and they confirm your transaction
            ID before preparing your order.
          </p>
        )}
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
