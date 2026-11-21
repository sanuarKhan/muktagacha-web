"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Group } from "@/lib/types";

export default function CommunityPage() {
  const { user, token } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"all" | "mine">("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"popular" | "new">("popular");

  function load() {
    setLoading(true);
    const req =
      view === "mine" && token
        ? api.get<Group[]>("/groups/mine", token)
        : api.get<Group[]>(
            `/groups?sort=${sort}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`,
            token ?? undefined,
          );
    req
      .then((list) => {
        // "My groups" is filtered on the page (it's a short list)
        const query = q.trim().toLowerCase();
        setGroups(view === "mine" && query ? list.filter((g) => g.name.toLowerCase().includes(query)) : list);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }

  // Re-run when auth resolves and when search / view / sort change.
  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, view, sort, q]);

  async function handleCreate() {
    if (!name.trim() || !token) return;
    setSaving(true);
    setError(null);
    try {
      const g = await api.post<Group>("/groups", { name: name.trim(), description: description.trim() || undefined, area: area.trim() || undefined }, token);
      setName("");
      setDescription("");
      setArea("");
      setShowForm(false);
      // Go straight to the new group so the creator can share it.
      window.location.href = `/community/${g.id}?created=1`;
    } catch (err) {
      const e = err as { message?: string | string[] };
      setError(Array.isArray(e.message) ? e.message[0] : e.message ?? "Could not create group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink-900)]">
          Community
        </h1>
        {user && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="text-sm font-medium bg-[var(--color-emerald-700)] text-white px-4 py-2 rounded-[var(--radius-pill)]"
          >
            {showForm ? "Cancel" : "+ Create a group"}
          </button>
        )}
      </div>
      <p className="text-[var(--color-ink-500)] mb-6">
        Local groups for Muktagacha neighbors — create one, join one, start talking.
      </p>

      {showForm && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-5 mb-6 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Group name — e.g. Bazar Road Residents"
            className="w-full text-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 outline-none focus:border-[var(--color-emerald-500)]"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group about? (optional)"
            className="w-full text-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 outline-none focus:border-[var(--color-emerald-500)]"
          />
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="Area / Ward (optional)"
            className="w-full text-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 outline-none focus:border-[var(--color-emerald-500)]"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="bg-[var(--color-emerald-600)] text-white text-sm font-medium rounded-[var(--radius-pill)] px-5 py-2 disabled:opacity-40"
          >
            {saving ? "Creating…" : "Create group"}
          </button>
        </div>
      )}

      {/* Find groups */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search groups — name, topic, area…"
          className="flex-1 min-w-[200px] text-sm rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-white px-4 py-2 outline-none focus:border-[var(--color-emerald-500)]"
        />
        {user && (
          <div className="flex bg-white rounded-[var(--radius-pill)] p-1 shadow-card">
            {(["all", "mine"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs font-medium px-3 py-1.5 rounded-[var(--radius-pill)] ${view === v ? "bg-[var(--color-emerald-700)] text-white" : "text-[var(--color-ink-500)]"}`}
              >
                {v === "all" ? "All groups" : "My groups"}
              </button>
            ))}
          </div>
        )}
        {view === "all" && (
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "popular" | "new")}
            className="text-xs rounded-[var(--radius-pill)] border border-[var(--color-border)] bg-white px-3 py-2"
          >
            <option value="popular">Most members</option>
            <option value="new">Newest</option>
          </select>
        )}
      </div>

      {loading ? (
        <p className="text-[var(--color-ink-500)] text-sm">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="text-[var(--color-ink-500)] text-sm">
          {q.trim()
            ? "No groups match your search."
            : view === "mine"
              ? "You haven't joined any group yet."
              : `No groups yet. ${user ? "Be the first to create one!" : "Log in to create one!"}`}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/community/${g.id}`}
              className="block bg-white rounded-[var(--radius-card)] shadow-card hover:shadow-hover-card transition-shadow p-5"
            >
              <h3 className="font-display font-semibold text-[var(--color-ink-900)] mb-1 flex items-center gap-2">
                {g.name}
                {g.myRole === "OWNER" && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-gold-50)] text-[var(--color-gold-600)]">Owner</span>
                )}
              </h3>
              {g.description && (
                <p className="text-sm text-[var(--color-ink-500)] mb-2 line-clamp-2">{g.description}</p>
              )}
              <div className="flex items-center gap-3 text-xs text-[var(--color-ink-500)]">
                <span>{g._count?.members ?? 0} member{(g._count?.members ?? 0) === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{g._count?.topics ?? 0} topic{(g._count?.topics ?? 0) === 1 ? "" : "s"}</span>
                {g.area && (
                  <>
                    <span>·</span>
                    <span>{g.area}</span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
