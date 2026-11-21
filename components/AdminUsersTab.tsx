"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import DeleteAccountDialog from "@/components/DeleteAccountDialog";

// Admin → Users: every account (buyers, vendors, riders), searchable,
// with what they own and a safe Delete (see DeleteAccountDialog).
type Row = {
  id: string;
  fullName: string;
  phone: string;
  role: string;
  area?: string | null;
  createdAt: string;
  organizations: { id: string; name: string; approvalStatus: string }[];
  riderProfile?: { approvalStatus: string } | null;
  _count: { orders: number };
};

const ROLE_STYLE: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-700",
  VENDOR: "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]",
  RIDER: "bg-blue-50 text-blue-700",
  BUYER: "bg-[var(--color-cream-100)] text-[var(--color-ink-700)]",
};

export default function AdminUsersTab({ token, onChanged }: { token: string; onChanged?: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  function load(query = q) {
    setLoading(true);
    api
      .get<Row[]>(`/users/admin/list${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`, token)
      .then(setRows)
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const shown = rows.filter((r) => role === "ALL" || r.role === role);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search name or phone…"
          className="flex-1 min-w-[200px] rounded-[var(--radius-pill)] border border-[var(--color-ink-200,#e5e5e0)] px-4 py-2 text-sm"
        />
        <button onClick={() => load()} className="px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-emerald-700)] text-white text-sm font-medium">
          Search
        </button>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-[var(--radius-pill)] border border-[var(--color-ink-200,#e5e5e0)] px-3 py-2 text-sm bg-white">
          <option value="ALL">All roles</option>
          <option value="BUYER">Buyers</option>
          <option value="VENDOR">Vendors</option>
          <option value="RIDER">Riders</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      {notice && <p className="mb-3 text-sm text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2">{notice}</p>}
      {loading && <p className="text-[var(--color-ink-500)] text-sm">Loading…</p>}
      {!loading && shown.length === 0 && <p className="text-[var(--color-ink-500)] text-sm">No accounts found.</p>}

      <div className="space-y-2">
        {shown.map((u) => (
          <div key={u.id} className="bg-white rounded-[var(--radius-card)] shadow-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-[var(--color-ink-900)] flex items-center gap-2">
                {u.fullName}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_STYLE[u.role] ?? ""}`}>{u.role}</span>
              </p>
              <p className="text-sm text-[var(--color-ink-500)]">
                <a href={`tel:${u.phone}`} className="underline">{u.phone}</a>
                {u.area ? ` · ${u.area}` : ""} · joined {new Date(u.createdAt).toLocaleDateString()} · {u._count.orders} order(s)
              </p>
              {u.organizations.length > 0 && (
                <p className="text-xs text-[var(--color-ink-500)] mt-0.5">
                  Shop: {u.organizations.map((o) => `${o.name} (${o.approvalStatus.toLowerCase()})`).join(", ")}
                </p>
              )}
              {u.riderProfile && <p className="text-xs text-[var(--color-ink-500)] mt-0.5">Rider: {u.riderProfile.approvalStatus.toLowerCase()}</p>}
            </div>
            {u.role !== "ADMIN" && (
              <DeleteAccountDialog
                mode="admin"
                userId={u.id}
                token={token}
                onDone={(r) => {
                  setNotice(
                    r.mode === "deleted"
                      ? `${u.fullName} was deleted. The number ${u.phone} can sign up again.`
                      : `${u.fullName}'s account was closed (history kept). The number ${u.phone} can sign up again.`,
                  );
                  load();
                  onChanged?.();
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
