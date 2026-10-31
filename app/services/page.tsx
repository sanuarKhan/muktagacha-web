"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Organization, Category } from "@/lib/types";

export default function ServicesPageWrapper() {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto px-5 py-12">Loading...</div>}>
      <ServicesPage />
    </Suspense>
  );
}

function ServicesPage() {
  const { user, token } = useAuth();
  const [providers, setProviders] = useState<Organization[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingFor, setBookingFor] = useState<Organization | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Organization[]>("/organizations?vertical=SERVICES"),
      api.get<Category[]>("/categories?vertical=SERVICES"),
    ])
      .then(([orgs, cats]) => {
        setProviders(orgs);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="max-w-4xl mx-auto px-5 py-12">Loading...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)]">
      <div className="max-w-4xl mx-auto px-5 py-10">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink-900)] mb-1">
          Local services
        </h1>
        <p className="text-[var(--color-ink-500)] mb-8">
          Electricians, AC repair, plumbers, cleaning — describe what you
          need and the provider sends you a price quote.
        </p>

        {providers.length === 0 && (
          <p className="text-[var(--color-ink-500)] bg-white rounded-[var(--radius-card)] shadow-card p-6">
            No service providers have joined yet — check back soon.
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
              </p>
              <button
                onClick={() => {
                  setBookingFor(p);
                  setSubmitted(false);
                }}
                className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors"
              >
                Request a quote
              </button>
            </div>
          ))}
        </div>
      </div>

      {bookingFor && (
        <BookingModal
          org={bookingFor}
          categories={categories.filter((c) => true)}
          user={user}
          token={token}
          onClose={() => setBookingFor(null)}
          submitted={submitted}
          onSubmitted={() => setSubmitted(true)}
        />
      )}
    </div>
  );
}

function BookingModal({
  org,
  categories,
  user,
  token,
  onClose,
  submitted,
  onSubmitted,
}: {
  org: Organization;
  categories: Category[];
  user: any;
  token: string | null;
  onClose: () => void;
  submitted: boolean;
  onSubmitted: () => void;
}) {
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [addressText, setAddressText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !token) {
      setError("Please log in first to request a service.");
      return;
    }
    if (!description.trim()) {
      setError("Describe what you need help with.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(
        "/service-requests",
        {
          organizationId: org.id,
          categoryId: categoryId || undefined,
          description: description.trim(),
          preferredTime: preferredTime || undefined,
          addressText: addressText || undefined,
        },
        token,
      );
      onSubmitted();
    } catch (err: any) {
      setError(err?.message ?? "Could not send your request. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[var(--color-ink-900)]/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[var(--radius-card)] shadow-elevated max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">✓</p>
            <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)] mb-1">
              Request sent
            </h3>
            <p className="text-sm text-[var(--color-ink-500)] mb-4">
              {org.name} will review your request and send you a price quote. Check
              "My bookings" for updates.
            </p>
            <button
              onClick={onClose}
              className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3.5">
            <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)]">
              Request a quote from {org.name}
            </h3>
            {categories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                  What kind of job is this?
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                >
                  <option value="">Not sure / other</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                Describe what you need done
              </label>
              <textarea
                required
                rows={4}
                placeholder="e.g. My AC isn't cooling, making a buzzing noise..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                When works for you?
              </label>
              <input
                placeholder="e.g. tomorrow morning, this weekend"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                Your address
              </label>
              <input
                placeholder="House/road/area details"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-6 py-2.5 font-medium hover:bg-[var(--color-emerald-900)] transition-colors disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
