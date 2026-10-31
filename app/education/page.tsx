"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Organization, BookingSlot } from "@/lib/types";

export default function EducationPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-5 py-12">Loading...</div>}>
      <EducationPage />
    </Suspense>
  );
}

function EducationPage() {
  const { user, token } = useAuth();
  const [providers, setProviders] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<Organization | null>(null);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booked, setBooked] = useState<BookingSlot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Organization[]>("/organizations?vertical=EDUCATION")
      .then(setProviders)
      .finally(() => setLoading(false));
  }, []);

  function openProvider(org: Organization) {
    setViewing(org);
    setBooked(null);
    setError(null);
    setSlotsLoading(true);
    api
      .get<BookingSlot[]>(`/organizations/${org.id}/slots`)
      .then(setSlots)
      .finally(() => setSlotsLoading(false));
  }

  async function book(slot: BookingSlot) {
    if (!user || !token) {
      setError("Please log in first to book a session.");
      return;
    }
    setError(null);
    try {
      await api.post(`/slots/${slot.id}/book`, {}, token);
      setBooked(slot);
    } catch (err: any) {
      setError(err?.message ?? "Could not book this slot - it may have just been taken.");
      // Refresh so a taken slot disappears from the list immediately.
      if (viewing) {
        api.get<BookingSlot[]>(`/organizations/${viewing.id}/slots`).then(setSlots);
      }
    }
  }

  if (loading) {
    return <div className="max-w-4xl mx-auto px-5 py-12">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)]">
      <div className="max-w-4xl mx-auto px-5 py-10">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink-900)] mb-1">
          Tutoring &amp; consultation
        </h1>
        <p className="text-[var(--color-ink-500)] mb-8">
          Pick a real time slot and book instantly — no waiting for a quote.
        </p>

        {providers.length === 0 && (
          <p className="text-[var(--color-ink-500)] bg-white rounded-[var(--radius-card)] shadow-card p-6">
            No tutors/consultants have joined yet — check back soon.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          {providers.map((p) => (
            <div key={p.id} className="bg-white rounded-[var(--radius-card)] shadow-card p-5">
              <p className="font-semibold text-[var(--color-ink-900)] flex items-center gap-1.5">
                {p.name}
                {p.verificationStatus === "VERIFIED" && (
                  <span className="text-xs font-medium text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] px-2 py-0.5 rounded-full">
                    ✓ Verified
                  </span>
                )}
              </p>
              <p className="text-sm text-[var(--color-ink-500)] mb-3">
                {p.area} {p.ward ? `· ${p.ward}` : ""}
                {p.reviewCount ? ` · ★ ${Number(p.avgRating).toFixed(1)} (${p.reviewCount})` : ""}
              </p>
              <button
                onClick={() => openProvider(p)}
                className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors"
              >
                View available slots
              </button>
            </div>
          ))}
        </div>
      </div>

      {viewing && (
        <div
          className="fixed inset-0 bg-[var(--color-ink-900)]/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white rounded-[var(--radius-card)] shadow-elevated max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {booked ? (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">✓</p>
                <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)] mb-1">
                  Session booked!
                </h3>
                <p className="text-sm text-[var(--color-ink-500)] mb-4">
                  {booked.title} on {new Date(booked.startAt).toLocaleString()}. Check "My
                  bookings" to pay and get the meeting link.
                </p>
                <button
                  onClick={() => setViewing(null)}
                  className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)]"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)] mb-4">
                  {viewing.name} — available slots
                </h3>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
                )}
                {slotsLoading ? (
                  <p className="text-[var(--color-ink-500)]">Loading...</p>
                ) : slots.length === 0 ? (
                  <p className="text-[var(--color-ink-500)]">No open slots right now.</p>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="border border-[var(--color-border)] rounded-[12px] p-3 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-medium text-[var(--color-ink-900)] text-sm">{slot.title}</p>
                          <p className="text-xs text-[var(--color-ink-500)]">
                            {new Date(slot.startAt).toLocaleString()} ·{" "}
                            {new Date(slot.endAt).toLocaleTimeString()} · ৳{slot.price}
                            {slot.isOnline ? " · Online" : ` · ${slot.location}`}
                          </p>
                        </div>
                        <button
                          onClick={() => book(slot)}
                          className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--color-emerald-900)] shrink-0"
                        >
                          Book
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
