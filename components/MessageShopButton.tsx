"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { openChat } from "@/lib/chat-events";

// "Message shop" — anyone logged in (buyer, another vendor, admin) can
// start a private chat with a shop. The shop then replies from its chat
// box. A shop can't message its own owner.
export default function MessageShopButton({
  shopId,
  shopName,
  className,
  productName,
}: {
  shopId: string;
  shopName: string;
  className?: string;
  productName?: string;
}) {
  const { user, token } = useAuth();
  // Hide on your own shop (server refuses it too).
  const [isOwnShop, setIsOwnShop] = useState(false);
  useEffect(() => {
    if (!token || user?.role !== "VENDOR") return;
    api
      .get<{ id: string }[]>("/organizations/mine", token)
      .then((mine) => setIsOwnShop(mine.some((o) => o.id === shopId)))
      .catch(() => {});
  }, [token, user?.role, shopId]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(productName ? `Hi, is "${productName}" available?` : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const btnClass =
    className ??
    "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-emerald-700)] text-white text-sm font-medium hover:bg-[var(--color-emerald-900)]";

  if (isOwnShop) return null;

  if (!user) {
    return (
      <Link href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`} className={btnClass}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 1 1 21 11.5z"/></svg> Message shop
      </Link>
    );
  }

  async function send() {
    if (!text.trim() || !token) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.post<{ conversation: { id: string } }>(
        "/chat/conversations",
        { organizationId: shopId, body: text.trim() },
        token,
      );
      setOpen(false);
      setText("");
      openChat({ tab: "shops", conversationId: r.conversation.id });
    } catch (e: any) {
      setError((Array.isArray(e?.message) ? e.message[0] : e?.message) || "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={btnClass}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 1 1 21 11.5z"/></svg> Message shop
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-[var(--radius-card)] shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">Message {shopName}</h3>
            <p className="text-sm text-[var(--color-ink-500)] mt-1">
              The shop will reply here on Muktagacha. Your phone number is not shared.
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={4000}
              autoFocus
              placeholder="Ask about a product, price, size, delivery…"
              className="mt-3 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
            />
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="px-4 py-2 text-sm text-[var(--color-ink-500)]">
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={busy || !text.trim()}
                className="px-5 py-2 rounded-full bg-[var(--color-emerald-700)] text-white text-sm font-medium disabled:opacity-40"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
