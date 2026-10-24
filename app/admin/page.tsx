"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Organization, Product, Category } from "@/lib/types";

interface AdminStats {
  totalUsers: number;
  totalVendors: number;
  approvedVendors: number;
  pendingVendors: number;
  rejectedVendors: number;
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingPaymentVerifications: number;
}

type Tab = "pending" | "vendors" | "catalog" | "categories";

const inputClass =
  "border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]";

export default function AdminPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<Organization[]>([]);
  const [allVendors, setAllVendors] = useState<Organization[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [newCategory, setNewCategory] = useState({ name: "", vertical: "MARKETPLACE" });

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
      api.get<Product[]>("/products/admin/all", token),
      api.get<Category[]>("/categories"),
    ])
      .then(([p, v, s, c, cat]) => {
        setPending(p);
        setAllVendors(v);
        setStats(s);
        setCatalog(c);
        setCategories(cat);
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

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newCategory.name.trim()) return;
    await api.post("/categories", newCategory, token);
    setNewCategory({ name: "", vertical: "MARKETPLACE" });
    loadAll();
  }

  async function removeCategory(id: string) {
    if (!token) return;
    await api.delete(`/categories/${id}`, token);
    loadAll();
  }

  const filteredCatalog = catalogSearch
    ? catalog.filter((p) =>
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()),
      )
    : catalog;

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
          Platform overview, vendor approvals, and product catalog.
        </p>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
            <StatCard label="Total users" value={stats.totalUsers} />
            <StatCard
              label="Vendors"
              value={stats.totalVendors}
              sub={`${stats.approvedVendors} approved`}
            />
            <StatCard label="Products" value={stats.activeProducts} />
            <StatCard label="Orders" value={stats.totalOrders} />
            <StatCard
              label="Payments to verify"
              value={stats.pendingPaymentVerifications}
              highlight={stats.pendingPaymentVerifications > 0}
            />
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)] overflow-x-auto">
          <TabButton active={tab === "pending"} onClick={() => setTab("pending")} label={`Pending approval (${pending.length})`} />
          <TabButton active={tab === "vendors"} onClick={() => setTab("vendors")} label={`All vendors (${allVendors.length})`} />
          <TabButton active={tab === "catalog"} onClick={() => setTab("catalog")} label={`Product catalog (${catalog.length})`} />
          <TabButton active={tab === "categories"} onClick={() => setTab("categories")} label={`Categories (${categories.length})`} />
        </div>

        {tab === "pending" && (
          <div className="space-y-3">
            {pending.length === 0 && (
              <p className="text-[var(--color-ink-500)]">No pending storefronts to review.</p>
            )}
            {pending.map((org) => (
              <div key={org.id} className="bg-white rounded-[var(--radius-card)] shadow-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--color-ink-900)]">{org.name}</p>
                  <p className="text-sm text-[var(--color-ink-500)]">
                    {org.vertical} · {org.area} {org.ward ? `· ${org.ward}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(org.id)} className="bg-[var(--color-emerald-700)] text-white px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors">
                    Approve
                  </button>
                  <button onClick={() => reject(org.id)} className="bg-red-50 text-red-700 px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-red-100 transition-colors">
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
              <p className="text-[var(--color-ink-500)]">No vendors have signed up yet.</p>
            )}
            {allVendors.map((org: any) => (
              <div key={org.id} className="bg-white rounded-[var(--radius-card)] shadow-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[var(--color-ink-900)]">{org.name}</p>
                  <p className="text-sm text-[var(--color-ink-500)]">
                    {org.vertical} · {org._count?.listings ?? 0} product(s) · {org.owner?.phone}
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

        {tab === "catalog" && (
          <div>
            <input
              placeholder="Search products by name..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className={`${inputClass} w-full max-w-sm mb-4`}
            />
            <div className="bg-white rounded-[var(--radius-card)] shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[var(--color-ink-500)] border-b border-[var(--color-border)]">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Price</th>
                    <th className="px-4 py-3 font-medium">Variants</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="px-4 py-3 font-medium text-[var(--color-ink-900)]">{p.name}</td>
                      <td className="px-4 py-3 text-[var(--color-ink-500)]">{p.organization?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--color-ink-500)]">{p.category?.name ?? "Uncategorized"}</td>
                      <td className="px-4 py-3 text-[var(--color-emerald-700)] font-medium">৳{p.basePrice}</td>
                      <td className="px-4 py-3 text-[var(--color-ink-500)]">{p.hasVariants ? `${p.variants.length}` : "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.isActive
                              ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]"
                              : "bg-[var(--color-ink-50,#f1f1ef)] text-[var(--color-ink-500)]"
                          }`}
                        >
                          {p.isActive ? "Active" : "Removed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCatalog.length === 0 && (
                <p className="text-sm text-[var(--color-ink-500)] p-6 text-center">No products found.</p>
              )}
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div>
            <form onSubmit={createCategory} className="bg-white rounded-[var(--radius-card)] shadow-card p-4 mb-4 flex gap-2 items-end flex-wrap">
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-700)] mb-1">Category name</label>
                <input
                  placeholder="e.g. Men's Panjabi"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--color-ink-700)] mb-1">Shop type</label>
                <select
                  value={newCategory.vertical}
                  onChange={(e) => setNewCategory({ ...newCategory, vertical: e.target.value })}
                  className={inputClass}
                >
                  <option value="MARKETPLACE">Marketplace</option>
                  <option value="PHARMACY">Pharmacy</option>
                  <option value="SERVICES">Services</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-[var(--color-emerald-700)] text-white px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-[var(--color-emerald-900)]"
              >
                Add category
              </button>
            </form>
            <div className="space-y-2">
              {categories.map((c) => (
                <div key={c.id} className="bg-white rounded-[var(--radius-card)] shadow-card p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[var(--color-ink-900)]">{c.name}</span>
                    <span className="text-xs text-[var(--color-ink-500)] ml-2">{c.vertical}</span>
                  </div>
                  <button onClick={() => removeCategory(c.id)} className="text-xs text-[var(--color-ink-300)] hover:text-red-600">
                    Remove
                  </button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-[var(--color-ink-500)]">No categories yet — add one above.</p>
              )}
            </div>
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
  highlight,
}: {
  label: string;
  value: number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] shadow-card p-4 ${
        highlight ? "bg-[var(--color-gold-50)]" : "bg-white"
      }`}
    >
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
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active
          ? "border-[var(--color-emerald-700)] text-[var(--color-emerald-700)]"
          : "border-transparent text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
      }`}
    >
      {label}
    </button>
  );
}
