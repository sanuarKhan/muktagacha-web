"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const SITE_URL = "https://muktagacha.skodedigital.tech";

type Member = { userId: string; role: "OWNER" | "MODERATOR" | "MEMBER"; joinedAt: string; user: { id: string; fullName: string; role: string } };

// Owner / moderator panel on a group page:
//  - invite link (copy / WhatsApp / new link that cancels the old one)
//  - Public ↔ Private switch (owner)
//  - members: make moderator, remove
export default function GroupManagePanel({
  groupId,
  groupName,
  isPrivate,
  myRole,
  myUserId,
  token,
  onChanged,
}: {
  groupId: string;
  groupName: string;
  isPrivate: boolean;
  myRole: "OWNER" | "MODERATOR";
  myUserId: string;
  token: string;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const isOwner = myRole === "OWNER";
  const link = code ? `${SITE_URL}/community/${groupId}?invite=${code}` : "";

  function load() {
    api.get<{ inviteCode: string }>(`/groups/${groupId}/invite`, token).then((r) => setCode(r.inviteCode)).catch(() => {});
    api.get<Member[]>(`/groups/${groupId}/members`, token).then(setMembers).catch(() => {});
  }
  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function act(fn: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      if (done) setMsg(done);
      load();
      onChanged();
    } catch (e: any) {
      setMsg((Array.isArray(e?.message) ? e.message[0] : e?.message) || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium px-4 py-2 rounded-[var(--radius-pill)] bg-[var(--color-gold-50)] text-[var(--color-gold-600)] hover:brightness-95"
      >
        ⚙ Manage group {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-[var(--radius-card)] shadow-card p-5 space-y-5">
          {/* Invite link */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Invite link</h3>
            <p className="text-xs text-[var(--color-ink-500)] mt-0.5">
              {isPrivate
                ? "This group is private — only people with this link can join."
                : "Anyone can join from the Community page; this link takes people straight to the group."}
            </p>
            <div className="mt-2 flex gap-2">
              <code className="flex-1 bg-[var(--color-cream-100)] rounded-xl px-3 py-2 text-xs break-all">{link || "Loading…"}</code>
              <button onClick={copy} disabled={!link} className="px-3 py-2 rounded-xl bg-[var(--color-emerald-700)] text-white text-sm font-medium shrink-0 disabled:opacity-40">
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Join "${groupName}" on Muktagacha: ${link}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#25D366] text-white"
              >
                Send on WhatsApp
              </a>
              {isOwner && (
                <button
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Make a new invite link? The old link will stop working.")) {
                      act(() => api.post(`/groups/${groupId}/invite/reset`, {}, token), "New link created. The old link no longer works.");
                    }
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-ink-700)]"
                >
                  New link (cancel old)
                </button>
              )}
            </div>
          </div>

          {/* Privacy */}
          {isOwner && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Who can join</h3>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { v: false, t: "Public", d: "Shown on Community. Anyone can join." },
                  { v: true, t: "Private", d: "Hidden. Invite link only." },
                ].map((o) => (
                  <button
                    key={o.t}
                    disabled={busy || isPrivate === o.v}
                    onClick={() => act(() => api.patch(`/groups/${groupId}`, { isPrivate: o.v }, token), `Group is now ${o.t.toLowerCase()}.`)}
                    className={`text-left rounded-xl border px-3 py-2 ${
                      isPrivate === o.v ? "border-[var(--color-emerald-600)] bg-[var(--color-emerald-50)]" : "border-[var(--color-border)] bg-white"
                    }`}
                  >
                    <span className="block text-sm font-medium text-[var(--color-ink-900)]">
                      {o.t}
                    </span>
                    <span className="block text-[11px] text-[var(--color-ink-500)]">{o.d}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-ink-900)]">Members ({members.length})</h3>
            <div className="mt-2 divide-y divide-[var(--color-border)]">
              {members.map((m) => (
                <div key={m.userId} className="py-2 flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--color-ink-900)] truncate">{m.user.fullName}</span>
                    <span className="block text-[11px] text-[var(--color-ink-500)]">
                      {m.role === "OWNER" ? "Owner" : m.role === "MODERATOR" ? "Moderator" : "Member"}
                    </span>
                  </span>
                  {m.role !== "OWNER" && m.userId !== myUserId && (
                    <span className="flex gap-1.5 shrink-0">
                      {isOwner && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            act(() => api.patch(`/groups/${groupId}/members/${m.userId}`, { role: m.role === "MODERATOR" ? "MEMBER" : "MODERATOR" }, token))
                          }
                          className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-ink-700)]"
                        >
                          {m.role === "MODERATOR" ? "Remove moderator" : "Make moderator"}
                        </button>
                      )}
                      {(isOwner || m.role === "MEMBER") && (
                        <button
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Remove ${m.user.fullName} from the group?`)) act(() => api.delete(`/groups/${groupId}/members/${m.userId}`, token));
                          }}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-red-50 text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          {msg && <p className="text-sm text-[var(--color-ink-700)] bg-[var(--color-cream-100)] rounded-lg px-3 py-2">{msg}</p>}
        </div>
      )}
    </div>
  );
}
