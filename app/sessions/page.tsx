"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { SlotBooking } from "@/lib/types";

export default function SessionsPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<SlotBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [trxId, setTrxId] = useState("");
  const [rated, setRated] = useState<Record<string, boolean>>({});

  function load() {
    if (!token) return;
    api
      .get<SlotBooking[]>("/bookings/mine", token)
      .then(setBookings)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading, router]);

  async function submitPayment(id: string, paymentMethod: "CASH_ON_DELIVERY" | "BKASH" | "NAGAD" | "WALLET") {
    if (!token) return;
    await api.post(
      `/bookings/${id}/payment`,
      { paymentMethod, trxId: paymentMethod === "BKASH" || paymentMethod === "NAGAD" ? trxId : undefined },
      token,
    );
    setPaying(null);
    setTrxId("");
    load();
  }

  async function confirmCompletion(id: string) {
    if (!token) return;
    await api.post(`/bookings/${id}/confirm-completion`, {}, token);
    load();
  }

  async function rate(id: string, rating: number) {
    if (!token) return;
    await api.post(`/bookings/${id}/review`, { rating }, token);
    setRated((p) => ({ ...p, [id]: true }));
  }

  if (authLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] mb-6">
        My sessions
      </h1>
      {bookings.length === 0 && (
        <p className="text-[var(--color-ink-500)]">
          You haven't booked any tutoring/consultation sessions yet —{" "}
          <a href="/education" className="text-[var(--color-emerald-700)] underline">
            browse available slots
          </a>
          .
        </p>
      )}
      <div className="space-y-4">
        {bookings.map((b) => (
          <div key={b.id} className="bg-white rounded-[var(--radius-card)] shadow-card p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold">{b.slot?.title}</p>
                <p className="text-sm text-[var(--color-ink-500)]">
                  {b.slot?.organization?.name}
                </p>
                <p className="text-xs text-[var(--color-ink-300)]">
                  {b.slot && new Date(b.slot.startAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  b.slot?.status === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : b.slot?.status === "CANCELLED"
                      ? "bg-red-100 text-red-800"
                      : "bg-purple-100 text-purple-800"
                }`}
              >
                {b.slot?.status.replace(/_/g, " ")}
              </span>
            </div>

            {b.slot?.isOnline && b.slot?.meetingLink && (
              <a
                href={b.slot.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-emerald-700)] underline"
              >
                Join meeting link
              </a>
            )}

            {!b.paymentMethod && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-ink-500)] mb-2">
                  Pay ৳{b.slot?.price} for this session.
                </p>
                {paying === b.id ? (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => submitPayment(b.id, "CASH_ON_DELIVERY")} className="text-xs bg-[var(--color-cream-100)] px-3 py-1.5 rounded-full">
                      Cash
                    </button>
                    <button onClick={() => submitPayment(b.id, "WALLET")} className="text-xs bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] px-3 py-1.5 rounded-full font-medium">
                      Pay from wallet
                    </button>
                    <input
                      placeholder="bKash/Nagad TrxID"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="text-xs border border-[var(--color-border)] rounded-full px-3 py-1.5 flex-1"
                    />
                    <button
                      onClick={() => submitPayment(b.id, "BKASH")}
                      disabled={!trxId}
                      className="text-xs bg-[var(--color-emerald-700)] text-white px-3 py-1.5 rounded-full disabled:opacity-50"
                    >
                      Submit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPaying(b.id)}
                    className="text-xs bg-[var(--color-emerald-700)] text-white px-4 py-1.5 rounded-full font-medium"
                  >
                    Pay now
                  </button>
                )}
              </div>
            )}

            {b.paymentMethod && (
              <p className="text-xs text-[var(--color-ink-500)] mt-2 pt-2 border-t border-[var(--color-border)]">
                Paid via {b.paymentMethod.replace(/_/g, " ")}
                {b.paymentVerification && b.paymentMethod !== "CASH_ON_DELIVERY" && (
                  <> · {b.paymentVerification.replace(/_/g, " ")}</>
                )}
              </p>
            )}

            {b.escrowStatus === "HELD" && b.slot?.status === "COMPLETED" && !b.buyerConfirmedAt && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-ink-700)] mb-2">
                  You paid from your wallet — confirm the session happened to release payment.
                </p>
                <button
                  onClick={() => confirmCompletion(b.id)}
                  className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-1.5 text-xs font-medium hover:bg-[var(--color-emerald-900)]"
                >
                  Confirm the session happened
                </button>
              </div>
            )}
            {b.escrowStatus === "HELD" && b.buyerConfirmedAt && (
              <p className="text-xs text-[var(--color-gold-600)] bg-[var(--color-gold-50)] rounded-lg px-3 py-2 mt-2">
                You confirmed — the tutor will be paid out shortly.
              </p>
            )}
            {b.escrowStatus === "RELEASED" && (
              <p className="text-xs text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2 mt-2">
                ✓ Payment released to the tutor.
              </p>
            )}

            {b.slot?.status === "COMPLETED" && !rated[b.id] && !b.shopReview && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center gap-1">
                <span className="text-xs text-[var(--color-ink-500)] mr-1">Rate this session:</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => rate(b.id, n)}
                    className="text-lg text-[var(--color-gold-600)] hover:scale-110 transition-transform"
                  >
                    ★
                  </button>
                ))}
              </div>
            )}
            {(rated[b.id] || b.shopReview) && (
              <p className="text-xs text-[var(--color-emerald-700)] mt-2 pt-2 border-t border-[var(--color-border)]">
                Thanks for the rating!
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
