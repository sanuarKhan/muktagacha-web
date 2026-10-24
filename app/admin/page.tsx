"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Organization } from "@/lib/types";

interface AdminStats {
  totalUsers: number;
  totalVendors: number;
  approvedVendors: number;
  pendingVendors: number;
  rejectedVendors: number;
  totalListings: number;
  activeListings: number;
  totalOrders: number;
}

type Tab = "pending" | "vendors";

export default function AdminPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<Organization[]>([]);
  const [allVendors, setAllVendors] = useState<Organization[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");

  useEffect(() => {
    if (authLoading) return;
    if (!token || user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    loadAll();
  }, [token, authLoading, user, router]);

  function loadAll() {
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.get<Organization[]>("/organizations/pending", token),
      api.get<Organization[]>("/admin/vendors", token),
      api.get<AdminStats>("/admin/stats", token),
    ])
      .then(([p, v, s]) => {
        setPending(p);
        setAllVendors(v);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }

  async function approve(id: string) {
    if (!token) return;
    await api.patch(`/organizations/${id}/approve`, {}, token);
    loadAll();
  }

  async function reject(id: string) {
    if (!token) return;
    await api.patch(`/organizations/${id}/reject`, {}, token);
    loadAll();
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)] flex items-center justify-center">
        <p className="text-[var(--color-ink-500)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)]">
      <div className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink-900)] mb-1">
          Admin
        </h1>
        <p className="text-[var(--color-ink-500)] mb-8">
          Platform overview and vendor approvals.
        </p>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <StatCard label="Total users" value={stats.totalUsers} />
            <StatCard
              label="Vendors"
              value={stats.totalVendors}
              sub={`${stats.approvedVendors} approved`}
            />
            <StatCard label="Products" value={stats.activeListings} />
            <StatCard label="Orders" value={stats.totalOrders} />
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          <TabButton
            active={tab === "pending"}
            onClick={() => setTab("pending")}
            label={`Pending approval (${pending.length})`}
          />
          <TabButton
            active={tab === "vendors"}
            onClick={() => setTab("vendors")}
            label={`All vendors (${allVendors.length})`}
          />
        </div>

        {tab === "pending" && (
          <div className="space-y-3">
            {pending.length === 0 && (
              <p className="text-[var(--color-ink-500)]">
                No pending storefronts to review.
              </p>
            )}
            {pending.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-[var(--radius-card)] shadow-card p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--color-ink-900)]">
                    {org.name}
                  </p>
                  <p className="text-sm text-[var(--color-ink-500)]">
                    {org.vertical} · {org.area}{" "}
                    {org.ward ? `· ${org.ward}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(org.id)}
                    className="bg-[var(--color-emerald-700)] text-white px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reject(org.id)}
                    className="bg-red-50 text-red-700 px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "vendors" && (
          <div className="space-y-2">
            {allVendors.length === 0 && (
              <p className="text-[var(--color-ink-500)]">
                No vendors have signed up yet.
              </p>
            )}
            {allVendors.map((org: any) => (
              <div
                key={org.id}
                className="bg-white rounded-[var(--radius-card)] shadow-card p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-[var(--color-ink-900)]">
                    {org.name}
                  </p>
                  <p className="text-sm text-[var(--color-ink-500)]">
                    {org.vertical} · {org._count?.listings ?? 0} product(s) ·{" "}
                    {org.owner?.phone}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    org.approvalStatus === "APPROVED"
                      ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]"
                      : org.approvalStatus === "PENDING"
                        ? "bg-[var(--color-gold-50)] text-[var(--color-gold-600)]"
                        : "bg-red-50 text-red-600"
                  }`}
                >
                  {org.approvalStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-card p-4">
      <p className="text-xs text-[var(--color-ink-500)] mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--color-ink-300)] mt-0.5">{sub}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-[var(--color-emerald-700)] text-[var(--color-emerald-700)]"
          : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
      }`}
    >
      {label}
    </button>
  );
}
