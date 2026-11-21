"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

// "New chat" inside the chat box: search shops and people.
//  - Shop  → small compose box → starts a shop chat
//  - Person → small compose box → starts a direct chat
// People list = people you share a community group with (admin: anyone).
type Shop = { id: string; name: string; slug?: string | null; logoUrl?: string | null; area?: string | null };
type Person = { id: string; fullName: string; role: string; via: string };
type Result = { shops: Shop[]; people: Person[]; inGroups: boolean | null };

export default function NewChatPanel({
  token,
  onStarted,
  onClose,
}: {
  token: string;
  onStarted: (kind: "shops" | "people", conversationId: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [target, setTarget] = useState<{ kind: "shop" | "person"; id: string; name: string } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get<Result>(`/direct-messages/contacts${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`, token)
        .then(setData)
        .catch(() => setData({ shops: [], people: [], inGroups: false }));
    }, 250);
    return () => clearTimeout(t);
  }, [q, token]);

  async function send() {
    if (!target || !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (target.kind === "shop") {
        const r = await api.post<{ conversation: { id: string } }>("/chat/conversations", { organizationId: target.id, body: text.trim() }, token);
        onStarted("shops", r.conversation.id);
      } else {
        const r = await api.post<{ conversation: { id: string } }>("/direct-messages/conversations", { recipientId: target.id, body: text.trim() }, token);
        onStarted("people", r.conversation.id);
      }
    } catch (e: any) {
      setError((Array.isArray(e?.message) ? e.message[0] : e?.message) || "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  if (target) {
    return (
      <div className="p-4 space-y-3">
        <button onClick={() => setTarget(null)} className="text-xs text-[var(--color-ink-500)]">← Back to search</button>
        <p className="text-sm font-semibold text-[var(--color-ink-900)]">
          Message {target.name}
          <span className="block text-[11px] font-normal text-[var(--color-ink-500)]">Your phone number is not shared.</span>
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={4000}
          autoFocus
          placeholder={target.kind === "shop" ? "Ask about a product, price, delivery…" : "Write a message…"}
          className="w-full rounded-xl bg-white/80 border border-white/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
        />
        {error && <p className="text-xs text-red-700">{error}</p>}
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          className="w-full py-2 rounded-full bg-[var(--color-emerald-700)] text-white text-sm font-medium disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send"}
        </button>
      </div>
    );
  }

  const Row = ({ title, sub, initial, logo, onClick }: { title: string; sub: string; initial: string; logo?: string | null; onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left px-4 py-2.5 hover:bg-white/30 flex items-center gap-3">
      <span className="w-8 h-8 rounded-full bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] text-sm font-semibold flex items-center justify-center overflow-hidden shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {logo ? (
          <img
            src={logo}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              const el = e.currentTarget;
              el.replaceWith(document.createTextNode(initial));
            }}
          />
        ) : (
          initial
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-[var(--color-ink-900)] truncate">{title}</span>
        <span className="block text-[11px] text-[var(--color-ink-500)] truncate">{sub}</span>
      </span>
    </button>
  );

  return (
    <div>
      <div className="px-3 pt-3 pb-2 flex gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Search shops or people…"
          className="flex-1 bg-white/70 rounded-full px-3.5 py-2 text-sm outline-none placeholder:text-[var(--color-ink-500)]"
        />
        <button onClick={onClose} className="text-xs text-[var(--color-ink-500)] px-1">Cancel</button>
      </div>
      {!data ? (
        <p className="text-center text-xs text-[var(--color-ink-500)] mt-6">Loading…</p>
      ) : (
        <>
          <p className="px-4 pt-2 text-[10px] uppercase tracking-wide text-[var(--color-ink-500)]">Shops</p>
          {data.shops.length === 0 ? (
            <p className="px-4 py-2 text-xs text-[var(--color-ink-500)]">No shops found.</p>
          ) : (
            data.shops.map((s) => (
              <Row key={s.id} title={s.name} sub={s.area || "Shop"} initial={s.name[0]} logo={s.logoUrl} onClick={() => setTarget({ kind: "shop", id: s.id, name: s.name })} />
            ))
          )}
          <p className="px-4 pt-3 text-[10px] uppercase tracking-wide text-[var(--color-ink-500)]">People</p>
          {data.people.length === 0 ? (
            <p className="px-4 py-2 text-xs text-[var(--color-ink-500)]">
              {data.inGroups === false ? (
                <>
                  Join a group on the <Link href="/community" className="underline">Community page</Link> to chat with people there.
                </>
              ) : (
                "No people found."
              )}
            </p>
          ) : (
            data.people.map((p) => (
              <Row key={p.id} title={p.fullName} sub={data.inGroups === null ? p.via : `In ${p.via}`} initial={p.fullName[0]} onClick={() => setTarget({ kind: "person", id: p.id, name: p.fullName })} />
            ))
          )}
          <div className="h-3" />
        </>
      )}
    </div>
  );
}
