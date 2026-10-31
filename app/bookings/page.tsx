"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { ServiceRequest } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-800",
  QUOTED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default function BookingsPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [trxId, setTrxId] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.push("/login");
      return;
    }
    api
      .get<ServiceRequest[]>("/service-requests/mine", token)
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  async function respond(id: string, status: "ACCEPTED" | "CANCELLED") {
    if (!token) return;
    const updated = await api.patch<ServiceRequest>(`/service-requests/${id}/status`, { status }, token);
    setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
  }

  async function submitPayment(id: string, paymentMethod: "CASH_ON_DELIVERY" | "BKASH" | "NAGAD") {
    if (!token) return;
    const updated = await api.post<ServiceRequest>(
      `/service-requests/${id}/payment`,
      { paymentMethod, trxId: paymentMethod === "CASH_ON_DELIVERY" ? undefined : trxId },
      token,
    );
    setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
    setPaying(null);
    setTrxId("");
  }

  if (authLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] mb-6">
        My bookings
      </h1>
      {bookings.length === 0 && (
        <p className="text-[var(--color-ink-500)]">
          You haven't requested any services yet —{" "}
          <a href="/services" className="text-[var(--color-emerald-700)] underline">
            browse local services
          </a>
          .
        </p>
      )}
      <div className="space-y-4">
        {bookings.map((b) => (
          <div key={b.id} className="bg-white rounded-[var(--radius-card)] shadow-card p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold">{b.organization?.name ?? "Provider"}</p>
                <p className="text-xs text-[var(--color-ink-300)]">
                  {new Date(b.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[b.status] ?? "bg-neutral-100"}`}>
                {b.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-[var(--color-ink-700)]">{b.description}</p>

            {b.status === "QUOTED" && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-sm font-medium text-[var(--color-ink-900)] mb-1">
                  Quote: ৳{b.quotedPrice}
                </p>
                {b.quoteNote && <p className="text-xs text-[var(--color-ink-500)] mb-2">{b.quoteNote}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(b.id, "ACCEPTED")}
                    className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-2 text-xs font-medium hover:bg-[var(--color-emerald-900)]"
                  >
                    Accept quote
                  </button>
                  <button
                    onClick={() => respond(b.id, "CANCELLED")}
                    className="bg-red-50 text-red-700 rounded-[var(--radius-pill)] px-4 py-2 text-xs font-medium hover:bg-red-100"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {b.status === "COMPLETED" && !b.paymentMethod && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-ink-500)] mb-2">
                  Job completed — pay ৳{b.quotedPrice} to the provider.
                </p>
                {paying === b.id ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button onClick={() => submitPayment(b.id, "CASH_ON_DELIVERY")} className="text-xs bg-[var(--color-cream-100)] px-3 py-1.5 rounded-full">
                        Cash
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
          </div>
        ))}
      </div>
    </div>
  );
}
