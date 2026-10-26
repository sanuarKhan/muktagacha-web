"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { RiderProfile, Order } from "@/lib/types";

const inputClass =
  "w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]";
const labelClass =
  "block text-sm font-medium text-[var(--color-ink-700)] mb-1.5";

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]",
  PENDING: "bg-[var(--color-gold-50)] text-[var(--color-gold-600)]",
  REJECTED: "bg-red-50 text-red-600",
};

export default function RiderPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ vehicleType: "Bicycle", coverageArea: "" });

  useEffect(() => {
    if (authLoading) return;
    if (!token || user?.role !== "RIDER") {
      router.push("/");
      return;
    }
    api
      .get<RiderProfile | null>("/riders/me", token)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [token, authLoading, user, router]);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setApplying(true);
    try {
      const p = await api.post<RiderProfile>("/riders/apply", form, token);
      setProfile(p);
    } finally {
      setApplying(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)] flex items-center justify-center">
        <p className="text-[var(--color-ink-500)]">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--color-cream-100)] px-5 py-10">
        <form
          onSubmit={apply}
          className="bg-white rounded-[var(--radius-card)] shadow-card p-6 space-y-4 max-w-sm w-full"
        >
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">
            Become a rider
          </h1>
          <p className="text-sm text-[var(--color-ink-500)]">
            Deliver orders for local shops and earn per delivery. Apply
            below — admin reviews every application before you can start
            picking up deliveries.
          </p>
          <div>
            <label className={labelClass}>How do you get around?</label>
            <select
              value={form.vehicleType}
              onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
              className={inputClass}
            >
              <option value="On foot">On foot</option>
              <option value="Bicycle">Bicycle</option>
              <option value="Motorcycle">Motorcycle</option>
              <option value="CNG/Rickshaw">CNG / Rickshaw</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Area you can cover</label>
            <input
              required
              placeholder="e.g. Muktagacha Bazar, Ward 1-3"
              value={form.coverageArea}
              onChange={(e) => setForm({ ...form, coverageArea: e.target.value })}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={applying}
            className="w-full bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] py-3 font-medium hover:bg-[var(--color-emerald-900)] transition-colors disabled:opacity-50"
          >
            {applying ? "Submitting..." : "Submit application"}
          </button>
        </form>
      </div>
    );
  }

  if (profile.approvalStatus !== "APPROVED") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--color-cream-100)] px-5 py-10">
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-6 max-w-sm w-full text-center">
          <span
            className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium mb-4 ${STATUS_STYLE[profile.approvalStatus]}`}
          >
            {profile.approvalStatus}
          </span>
          <h1 className="font-display text-xl font-semibold text-[var(--color-ink-900)] mb-2">
            {profile.approvalStatus === "PENDING"
              ? "Application under review"
              : "Application not approved"}
          </h1>
          <p className="text-sm text-[var(--color-ink-500)]">
            {profile.approvalStatus === "PENDING"
              ? "We'll let you know as soon as admin reviews your application."
              : "Contact support if you think this is a mistake."}
          </p>
        </div>
      </div>
    );
  }

  return <RiderDashboard profile={profile} token={token!} />;
}

function RiderDashboard({ profile, token }: { profile: RiderProfile; token: string }) {
  const [deliveries, setDeliveries] = useState<Order[]>([]);
  const [history, setHistory] = useState<Order[]>([]);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      api.get<Order[]>("/riders/me/deliveries", token),
      api.get<Order[]>("/riders/me/history", token),
    ])
      .then(([d, h]) => {
        setDeliveries(d);
        setHistory(h);
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function completeDelivery(orderId: string) {
    const deliveryNote = noteDrafts[orderId];
    const updated = await api.patch<Order>(
      `/riders/deliveries/${orderId}/complete`,
      deliveryNote ? { deliveryNote } : {},
      token,
    );
    setDeliveries((prev) => prev.filter((o) => o.id !== orderId));
    setHistory((prev) => [updated, ...prev]);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)]">
      <div className="max-w-3xl mx-auto px-5 py-10">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] mb-1">
          Rider dashboard
        </h1>
        <p className="text-[var(--color-ink-500)] mb-6">
          {profile.vehicleType} · {profile.coverageArea}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white rounded-[var(--radius-card)] shadow-card p-4">
            <p className="text-xs text-[var(--color-ink-500)] mb-1">Rating</p>
            <p className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">
              {profile.avgRating ? `★ ${Number(profile.avgRating).toFixed(1)}` : "No ratings yet"}
            </p>
          </div>
          <div className="bg-white rounded-[var(--radius-card)] shadow-card p-4">
            <p className="text-xs text-[var(--color-ink-500)] mb-1">Completed deliveries</p>
            <p className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">
              {profile.completedDeliveries}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "active"
                ? "border-[var(--color-emerald-700)] text-[var(--color-emerald-700)]"
                : "border-transparent text-[var(--color-ink-500)]"
            }`}
          >
            Active ({deliveries.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === "history"
                ? "border-[var(--color-emerald-700)] text-[var(--color-emerald-700)]"
                : "border-transparent text-[var(--color-ink-500)]"
            }`}
          >
            History ({history.length})
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-ink-500)]">Loading...</p>
        ) : tab === "active" ? (
          <div className="space-y-3">
            {deliveries.length === 0 && (
              <p className="text-sm text-[var(--color-ink-500)] bg-white rounded-[var(--radius-card)] shadow-card p-4">
                No deliveries assigned to you right now.
              </p>
            )}
            {deliveries.map((o) => (
              <div key={o.id} className="bg-white rounded-[var(--radius-card)] shadow-card p-4">
                <p className="font-semibold text-[var(--color-ink-900)]">
                  {o.organization?.name ?? "Vendor"}
                </p>
                <p className="text-sm text-[var(--color-ink-700)] mt-1">
                  Deliver to: {o.buyer?.fullName} — {o.buyer?.phone}
                </p>
                <p className="text-xs text-[var(--color-ink-500)]">
                  {o.buyer?.area} {o.buyer?.ward ? `· ${o.buyer.ward}` : ""}
                </p>
                <p className="text-xs text-[var(--color-ink-500)] mt-1">
                  {o.items?.length ?? 0} item(s) · {o.paymentMethod.replace(/_/g, " ")}
                </p>
                {o.deliveryLatitude && o.deliveryLongitude && (
                  <a
                    href={`https://www.openstreetmap.org/directions?from=&to=${o.deliveryLatitude}%2C${o.deliveryLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-emerald-700)] font-medium hover:underline mt-1.5"
                  >
                    📍 Open delivery location on map
                  </a>
                )}
                <div className="mt-3 flex gap-2">
                  <input
                    placeholder="Delivery note (optional)"
                    value={noteDrafts[o.id] ?? ""}
                    onChange={(e) =>
                      setNoteDrafts({ ...noteDrafts, [o.id]: e.target.value })
                    }
                    className="flex-1 border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => completeDelivery(o.id)}
                    className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] whitespace-nowrap"
                  >
                    Mark delivered
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {history.length === 0 && (
              <p className="text-sm text-[var(--color-ink-500)] bg-white rounded-[var(--radius-card)] shadow-card p-4">
                No completed deliveries yet.
              </p>
            )}
            {history.map((o) => (
              <div
                key={o.id}
                className="bg-white rounded-[var(--radius-card)] shadow-card p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink-900)]">
                    {o.organization?.name ?? "Vendor"}
                  </p>
                  <p className="text-xs text-[var(--color-ink-500)]">
                    {o.buyer?.fullName}
                  </p>
                </div>
                <span className="text-xs text-[var(--color-ink-300)]">
                  {o.deliveredAt ? new Date(o.deliveredAt).toLocaleDateString() : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
