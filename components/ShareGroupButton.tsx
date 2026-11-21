"use client";

import { useState } from "react";

const SITE_URL = "https://muktagacha.skodedigital.tech";

// Share a group: copy link, WhatsApp, Facebook, or the phone's own share
// sheet. The link opens the group page, where people tap "Join group".
export default function ShareGroupButton({ groupId, groupName, className }: { groupId: string; groupName: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = `${SITE_URL}/community/${groupId}`;
  const text = `Join "${groupName}" on Muktagacha: ${url}`;

  async function share() {
    // Phones: native share sheet (WhatsApp, Messenger, SMS… all in one).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: groupName, text: `Join "${groupName}" on Muktagacha`, url });
        return;
      } catch {
        /* cancelled → fall back to the menu */
      }
    }
    setOpen(true);
  }

  async function copy() {
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={share}
        className={
          className ??
          "inline-flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] text-[var(--color-ink-700)] bg-white hover:bg-[var(--color-cream-100)]"
        }
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        Share group
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-[var(--radius-card)] shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">Share {groupName}</h3>
            <p className="text-sm text-[var(--color-ink-500)] mt-1">Anyone with this link can open the group and tap Join.</p>
            <div className="mt-3 flex gap-2">
              <code className="flex-1 bg-[var(--color-cream-100)] rounded-xl px-3 py-2 text-xs break-all">{url}</code>
              <button onClick={copy} className="px-3 py-2 rounded-xl bg-[var(--color-emerald-700)] text-white text-sm font-medium shrink-0">
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(text)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-2 rounded-full bg-[#25D366] text-white text-sm font-medium"
              >
                WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center py-2 rounded-full bg-[#1877F2] text-white text-sm font-medium"
              >
                Facebook
              </a>
            </div>
            <button onClick={() => setOpen(false)} className="mt-4 w-full text-sm text-[var(--color-ink-500)]">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
