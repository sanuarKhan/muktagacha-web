"use client";

import { useState } from "react";
import { api } from "@/lib/api";

// "Delete" with a clear explanation of what will happen, used for:
//   - a vendor closing their own account   (endpoint: /users/me)
//   - an admin deleting any account        (endpoint: /users/admin/:id)
// The preview tells the person, BEFORE they confirm, whether the account
// will be removed completely or closed (when orders/bookings exist and
// must be kept). Either way the phone number becomes free to sign up again.

type Preview = {
  user: { fullName: string; phone: string; role: string };
  hasHistory: boolean;
  history: Record<string, number> & { walletBalance: number };
};

const LABELS: Record<string, string> = {
  orders: "orders",
  deliveries: "deliveries",
  shopOrdersAndBookings: "shop orders / bookings",
  serviceRequests: "service requests",
  bookings: "session bookings",
  reviews: "reviews",
  chats: "chat messages",
  community: "community posts",
  walletActivity: "wallet transactions",
  adminActions: "admin actions",
};

export default function DeleteAccountDialog({
  mode,
  userId,
  token,
  onDone,
  buttonLabel,
}: {
  mode: "self" | "admin";
  userId?: string;
  token: string;
  onDone: (result: { mode: "deleted" | "closed" }) => void;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const base = mode === "self" ? "/users/me" : `/users/admin/${userId}`;

  async function start() {
    setOpen(true);
    setError("");
    setTyped("");
    setPreview(null);
    try {
      setPreview(await api.get<Preview>(`${base}/delete-preview`, token));
    } catch (e: any) {
      setError(e?.message || "Could not load account details");
    }
  }

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      const r = await api.delete<{ mode: "deleted" | "closed" }>(base, token);
      setOpen(false);
      onDone(r);
    } catch (e: any) {
      setError((Array.isArray(e?.message) ? e.message.join(", ") : e?.message) || "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  const kept = preview
    ? Object.entries(LABELS)
        .filter(([k]) => (preview.history[k] ?? 0) > 0)
        .map(([k, label]) => `${preview.history[k]} ${label}`)
    : [];
  const self = mode === "self";

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="text-sm px-3 py-1.5 rounded-[var(--radius-pill)] bg-red-50 text-red-700 font-medium hover:bg-red-100"
      >
        {buttonLabel ?? (self ? "Delete my account" : "Delete")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4" onClick={() => !busy && setOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-[var(--radius-card)] shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">
              {self ? "Delete your account?" : `Delete ${preview?.user.fullName ?? "this account"}?`}
            </h3>

            {!preview && !error && <p className="text-sm text-[var(--color-ink-500)] mt-3">Checking the account…</p>}

            {preview && (
              <div className="mt-3 space-y-3 text-sm text-[var(--color-ink-700)]">
                {!preview.hasHistory ? (
                  <p>
                    {self ? "Your" : "This"} account{preview.user.role === "VENDOR" ? ", shop and products" : ""} will be
                    <b> removed completely</b>.
                  </p>
                ) : (
                  <>
                    <p>
                      {self ? "Your" : "This"} account has <b>{kept.join(", ")}</b>. Those records must be kept for the
                      other people involved, so the account will be <b>closed</b> instead: personal details removed,
                      {preview.user.role === "VENDOR" ? " shop hidden from the website," : ""} and login disabled.
                    </p>
                    {preview.history.walletBalance > 0 && (
                      <p className="text-red-700 bg-red-50 rounded-lg px-3 py-2">
                        Wallet balance ৳{preview.history.walletBalance.toLocaleString()} — settle it before closing.
                      </p>
                    )}
                  </>
                )}
                <p className="text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2">
                  The phone number {preview.user.phone} will be free to sign up again.
                </p>
                <label className="block">
                  Type <b>DELETE</b> to confirm
                  <input
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[var(--color-ink-200,#e5e5e0)] px-3 py-2"
                    autoFocus
                  />
                </label>
              </div>
            )}

            {error && <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-[var(--color-ink-500)]">
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={busy || !preview || typed.trim() !== "DELETE"}
                className="px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium bg-red-600 text-white disabled:opacity-40"
              >
                {busy ? "Deleting…" : preview?.hasHistory ? "Close account" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
