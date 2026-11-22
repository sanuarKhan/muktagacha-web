"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart, maxQuantity } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Order, PaymentMethod, Organization } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[220px] rounded-[14px] bg-[var(--color-cream-100)] flex items-center justify-center text-sm text-[var(--color-ink-300)]">
      Loading map...
    </div>
  ),
});

export default function CheckoutPage() {
  const { lines, linesByOrganization, clear, setQuantity, removeItem } = useCart();
  const { user, token } = useAuth();
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    "CASH_ON_DELIVERY",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trxIds, setTrxIds] = useState<Record<string, string>>({});
  const [vendorOrgs, setVendorOrgs] = useState<Record<string, Organization>>({});
  const [deliveryPin, setDeliveryPin] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);

  // Gift order state - sending this whole cart to someone else instead of
  // yourself (e.g. a surprise gift for a partner/friend).
  const [isGift, setIsGift] = useState(false);
  const [giftQuery, setGiftQuery] = useState("");
  const [giftResults, setGiftResults] = useState<{ id: string; fullName: string; phone: string }[]>([]);
  const [giftRecipient, setGiftRecipient] = useState<{ id: string; fullName: string; phone: string } | null>(null);
  const [giftSearching, setGiftSearching] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [giftAnonymous, setGiftAnonymous] = useState(false);
  const [giftAddress, setGiftAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const grouped = linesByOrganization();
  const total = lines.reduce(
    (sum, l) =>
      sum +
      Number(l.variant?.priceOverride ?? l.product.basePrice) * l.quantity,
    0,
  );
  const allVendorsHaveSkodePay =
    Object.keys(vendorOrgs).length > 0 &&
    Object.keys(grouped).every((orgId) => vendorOrgs[orgId]?.skodePayEnabled);

  useEffect(() => {
    if (!token) return;
    api.get<{ balance: string }>("/wallet/balance", token).then((w) => setWalletBalance(Number(w.balance)));
  }, [token]);

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

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location — please pin it on the map instead.");
      setShowMap(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeliveryPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setShowMap(true);
        setLocating(false);
      },
      () => {
        setError("Couldn't get your location — please pin it on the map instead.");
        setShowMap(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Debounced recipient search for the gift flow - searches by name or
  // phone (whichever the sender typed), min 2 chars to avoid a flood of
  // results on every keystroke.
  useEffect(() => {
    if (!isGift || !token || giftQuery.trim().length < 2) {
      setGiftResults([]);
      return;
    }
    const handle = setTimeout(() => {
      setGiftSearching(true);
      api
        .get<{ id: string; fullName: string; phone: string }[]>(
          `/users/search?q=${encodeURIComponent(giftQuery.trim())}`,
          token,
        )
        .then(setGiftResults)
        .catch(() => setGiftResults([]))
        .finally(() => setGiftSearching(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [giftQuery, isGift, token]);

  async function placeOrders() {
    if (!user || !token) {
      router.push("/login");
      return;
    }
    if (paymentMethod === "BKASH" || paymentMethod === "NAGAD") {
      const missing = Object.keys(grouped).filter((orgId) => !trxIds[orgId]?.trim());
      if (missing.length > 0) {
        setError(
          "Please enter the transaction ID for each vendor after paying via bKash/Nagad.",
        );
        return;
      }
    }
    if (paymentMethod === "WALLET" && walletBalance !== null && walletBalance < total) {
      setError(
        `Your wallet balance (৳${walletBalance.toFixed(2)}) isn't enough for this order (৳${total}). Top up your wallet first.`,
      );
      return;
    }
    if (isGift) {
      if (!giftRecipient) {
        setError("Choose who this gift is for.");
        return;
      }
      if (!giftAddress.trim()) {
        setError("Enter the recipient's delivery address for this gift.");
        return;
      }
    }
    setSubmitting(true);
    setError(null);
    try {
      // One order per vendor — each vendor fulfills their own sub-order
      // independently, matching the multi-vendor cart design from the plan.
      let firstSkodePayUrl: string | null = null;
      for (const [organizationId, groupLines] of Object.entries(grouped)) {
        const order = await api.post<Order>(
          "/orders",
          {
            organizationId,
            paymentMethod,
            deliveryLatitude: isGift ? undefined : deliveryPin?.lat,
            deliveryLongitude: isGift ? undefined : deliveryPin?.lng,
            deliveryAddressText: isGift ? giftAddress.trim() : undefined,
            isGift,
            recipientId: isGift ? giftRecipient?.id : undefined,
            giftMessage: isGift ? giftMessage.trim() || undefined : undefined,
            giftSenderAnonymous: isGift ? giftAnonymous : undefined,
            items: groupLines.map((l) => ({
              productId: l.product.id,
              variantId: l.variant?.id,
              quantity: l.quantity,
            })),
          },
          token,
        );
        if ((paymentMethod === "BKASH" || paymentMethod === "NAGAD") && trxIds[organizationId]) {
          await api.post(
            `/orders/${order.id}/payment-proof`,
            { trxId: trxIds[organizationId] },
            token,
          );
        }
        if (paymentMethod === "SKODEPAY" && !firstSkodePayUrl) {
          const checkout = await api.post<{ checkoutUrl: string }>(
            `/orders/${order.id}/skodepay-checkout`,
            {},
            token,
          );
          firstSkodePayUrl = checkout.checkoutUrl;
        }
      }
      clear();
      if (firstSkodePayUrl) {
        // Redirect to SkodePay's hosted checkout page to actually pay.
        window.location.href = firstSkodePayUrl;
      } else {
        router.push("/orders");
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center gap-3 bg-[var(--color-cream-100)] px-5 text-center">
        <p className="font-display text-xl font-semibold text-[var(--color-ink-900)]">Your cart is empty</p>
        <p className="text-sm text-[var(--color-ink-500)]">Browse local shops and add something you like.</p>
        <Link href="/" className="mt-1 bg-[var(--color-emerald-700)] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[var(--color-emerald-900)]">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)] px-5 py-10">
      <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">Checkout</h1>
        <Link href="/" className="text-sm text-[var(--color-emerald-700)] font-medium hover:underline">+ Add more items</Link>
      </div>

      {Object.entries(grouped).map(([orgId, groupLines]) => (
        <div
          key={orgId}
          className="bg-white rounded-[var(--radius-card)] shadow-card p-5 mb-4"
        >
          <h3 className="font-semibold text-sm text-[var(--color-ink-500)] mb-2">
            {groupLines[0].product.organization?.name ?? "Vendor"}
          </h3>
          <div className="divide-y divide-[var(--color-border)]">
          {groupLines.map((l) => {
            const unit = Number(l.variant?.priceOverride ?? l.product.basePrice);
            const max = maxQuantity(l.product, l.variant);
            const atMax = l.quantity >= max;
            const vId = l.variant?.id ?? null;
            const name = `${l.product.name}${l.variant ? ` (${Object.values(l.variant.optionValues).join(" / ")})` : ""}`;
            return (
              <div key={`${l.product.id}:${vId ?? ""}`} className="flex items-center gap-3 py-3">
                <div className="w-14 h-14 rounded-lg bg-[var(--color-cream-100)] overflow-hidden shrink-0">
                  {l.product.images?.[0]?.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.product.images[0].url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-ink-900)] truncate">{name}</p>
                  <p className="text-xs text-[var(--color-ink-500)]">৳{unit} each</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="inline-flex items-center rounded-full border border-[var(--color-border)]">
                      <button
                        type="button"
                        onClick={() => setQuantity(l.product.id, vId, l.quantity - 1)}
                        aria-label={l.quantity === 1 ? `Remove ${name}` : `One less ${name}`}
                        className="w-8 h-8 text-lg leading-none text-[var(--color-ink-700)] hover:bg-[var(--color-cream-100)] rounded-l-full"
                      >
                        −
                      </button>
                      <span className="min-w-[2rem] text-center text-sm font-semibold text-[var(--color-ink-900)]" aria-live="polite">
                        {l.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(l.product.id, vId, l.quantity + 1)}
                        disabled={atMax}
                        aria-label={`One more ${name}`}
                        className="w-8 h-8 text-lg leading-none text-[var(--color-ink-700)] hover:bg-[var(--color-cream-100)] rounded-r-full disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(l.product.id, vId)}
                      className="text-xs text-[var(--color-ink-500)] hover:text-red-700 underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  {atMax && max > 0 && (
                    <p className="text-[11px] text-[var(--color-gold-600)] mt-1">
                      {max === 1 ? "Only 1 available" : `Only ${max} available`}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-[var(--color-ink-900)] shrink-0">৳{unit * l.quantity}</span>
              </div>
            );
          })}
          </div>

          {(paymentMethod === "BKASH" || paymentMethod === "NAGAD") && (
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

      {/* Send as a gift - buyer pays, a different person receives it */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-card p-5 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => {
              setIsGift(e.target.checked);
              if (!e.target.checked) {
                setGiftRecipient(null);
                setGiftQuery("");
                setGiftMessage("");
                setGiftAnonymous(false);
                setGiftAddress("");
              }
            }}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium text-[var(--color-ink-900)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="inline -mt-0.5 mr-1"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v9H5v-9M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>Send this as a gift to someone else
          </span>
        </label>

        {isGift && (
          <div className="mt-4 space-y-3">
            {giftRecipient ? (
              <div className="flex items-center justify-between bg-[var(--color-emerald-50)] rounded-[var(--radius-sm)] px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink-900)]">{giftRecipient.fullName}</p>
                  <p className="text-xs text-[var(--color-ink-500)]">{giftRecipient.phone}</p>
                </div>
                <button
                  onClick={() => setGiftRecipient(null)}
                  className="text-xs text-[var(--color-ink-500)] hover:text-red-600"
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
                  Who is this gift for?
                </label>
                <input
                  value={giftQuery}
                  onChange={(e) => setGiftQuery(e.target.value)}
                  placeholder="Search by name or phone number…"
                  className="w-full border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                />
                {giftSearching && <p className="text-xs text-[var(--color-ink-500)] mt-1">Searching…</p>}
                {giftResults.length > 0 && (
                  <div className="mt-2 border border-[var(--color-border)] rounded-[10px] overflow-hidden divide-y divide-[var(--color-border)]">
                    {giftResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setGiftRecipient(u);
                          setGiftResults([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[var(--color-cream-100)] text-sm"
                      >
                        <span className="font-medium text-[var(--color-ink-900)]">{u.fullName}</span>{" "}
                        <span className="text-[var(--color-ink-500)]">{u.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
                Gift message (optional)
              </label>
              <input
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="e.g. Happy birthday! 🎉"
                className="w-full border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1">
                Recipient's delivery address
              </label>
              <input
                value={giftAddress}
                onChange={(e) => setGiftAddress(e.target.value)}
                placeholder="Their full address so the rider can deliver it"
                className="w-full border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={giftAnonymous}
                onChange={(e) => setGiftAnonymous(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-[var(--color-ink-700)]">
                Send anonymously (shown as "A Secret Admirer")
              </span>
            </label>
          </div>
        )}
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
          {walletBalance !== null && (
            <option value="WALLET">Wallet (balance ৳{walletBalance.toFixed(2)})</option>
          )}
          {allVendorsHaveSkodePay && (
            <option value="SKODEPAY">SkodePay (secure online payment)</option>
          )}
        </select>
        {(paymentMethod === "BKASH" || paymentMethod === "NAGAD") && (
          <p className="text-xs text-[var(--color-ink-500)] mt-2">
            Muktagacha doesn't process payments itself — you pay the vendor's
            own bKash/Nagad number directly, and they confirm your transaction
            ID before preparing your order.
          </p>
        )}
        {paymentMethod === "WALLET" && (
          <p className="text-xs text-[var(--color-ink-500)] mt-2">
            Paid instantly from your Muktagacha wallet balance — no waiting for
            vendor confirmation.{" "}
            <a href="/wallet" className="text-[var(--color-emerald-700)] underline">
              Manage your wallet
            </a>
            .
          </p>
        )}
        {paymentMethod === "SKODEPAY" && (
          <p className="text-xs text-[var(--color-ink-500)] mt-2">
            You'll be taken to a secure SkodePay payment page to complete
            your payment — no need to manually type a transaction ID.
          </p>
        )}
      </div>

      {!isGift && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-2">
            Delivery location (optional)
          </label>
          <p className="text-xs text-[var(--color-ink-500)] mb-2">
            Pin your exact location so the delivery rider can find you easily.
            If you skip this, we'll use your area/ward address instead.
          </p>
          {!showMap && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className="text-sm bg-white border border-[var(--color-border)] rounded-[var(--radius-pill)] px-4 py-2 hover:bg-[var(--color-emerald-50)] transition-colors disabled:opacity-50"
              >
                {locating ? "Finding you..." : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="inline -mt-0.5 mr-1"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>Use my current location</>}
              </button>
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="text-sm text-[var(--color-ink-500)] px-3 hover:text-[var(--color-ink-900)]"
              >
                Or pin on map
              </button>
            </div>
          )}
          {showMap && (
            <div>
              <LocationPicker
                lat={deliveryPin?.lat}
                lng={deliveryPin?.lng}
                onChange={(lat, lng) => setDeliveryPin({ lat, lng })}
                height={220}
              />
              {deliveryPin && (
                <p className="text-xs text-[var(--color-ink-500)] mt-1.5">
                  Pinned at {deliveryPin.lat.toFixed(5)}, {deliveryPin.lng.toFixed(5)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

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
