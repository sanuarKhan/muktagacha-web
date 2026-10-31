"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { WalletTransaction, WalletTopup } from "@/lib/types";

const PLATFORM_BKASH = process.env.NEXT_PUBLIC_PLATFORM_BKASH_NUMBER ?? "(not configured yet)";
const PLATFORM_NAGAD = process.env.NEXT_PUBLIC_PLATFORM_NAGAD_NUMBER ?? "(not configured yet)";

export default function WalletPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<string>("0");
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [topups, setTopups] = useState<WalletTopup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopupForm, setShowTopupForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"BKASH" | "NAGAD">("BKASH");
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function loadAll() {
    if (!token) return;
    Promise.all([
      api.get<{ balance: string }>("/wallet/balance", token),
      api.get<WalletTransaction[]>("/wallet/history", token),
      api.get<WalletTopup[]>("/wallet/topups/mine", token),
    ])
      .then(([b, h, t]) => {
        setBalance(b.balance);
        setHistory(h);
        setTopups(t);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.push("/login");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading, router]);

  async function requestTopup(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !amount) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/wallet/topup", { amount: Number(amount), method, trxId: trxId || undefined }, token);
      setSubmitted(true);
      setAmount("");
      setTrxId("");
      loadAll();
    } catch (err: any) {
      setError(err?.message ?? "Could not submit your top-up request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-10">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] mb-1">
        My wallet
      </h1>
      <p className="text-sm text-[var(--color-ink-500)] mb-6">
        Add credit once, pay instantly on any shop or service — no bKash/Nagad
        confirmation delay on checkout. Credit stays on Muktagacha: it can't
        be withdrawn as cash or sent to another person.
      </p>

      <div className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-card)] shadow-card p-6 mb-6">
        <p className="text-sm opacity-80 mb-1">Balance</p>
        <p className="font-display text-3xl font-semibold">৳{Number(balance).toFixed(2)}</p>
      </div>

      {!showTopupForm ? (
        <button
          onClick={() => {
            setShowTopupForm(true);
            setSubmitted(false);
          }}
          className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-emerald-900)] mb-8"
        >
          + Add credit
        </button>
      ) : (
        <form onSubmit={requestTopup} className="bg-white rounded-[var(--radius-card)] shadow-card p-5 space-y-3.5 mb-8">
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm text-[var(--color-ink-700)] mb-3">
                Your top-up request was submitted. An admin will verify your
                payment and add the credit shortly.
              </p>
              <button
                type="button"
                onClick={() => setShowTopupForm(false)}
                className="text-sm text-[var(--color-emerald-700)] font-medium"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-[var(--color-ink-500)] bg-[var(--color-gold-50)] rounded-lg px-3 py-2">
                Pay the platform directly, then submit the TrxID here:
                <br />
                bKash: <strong>{PLATFORM_BKASH}</strong> · Nagad: <strong>{PLATFORM_NAGAD}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                  Amount (৳)
                </label>
                <input
                  required
                  type="number"
                  min={10}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                  Paid via
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as "BKASH" | "NAGAD")}
                  className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                >
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                  Transaction ID
                </label>
                <input
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                />
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2.5 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit top-up"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTopupForm(false)}
                  className="text-sm text-[var(--color-ink-500)] px-3"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {topups.filter((t) => t.status === "PENDING_VERIFICATION").length > 0 && (
        <div className="mb-8">
          <h2 className="font-display font-semibold text-[var(--color-ink-900)] mb-3">
            Pending top-ups
          </h2>
          <div className="space-y-2">
            {topups
              .filter((t) => t.status === "PENDING_VERIFICATION")
              .map((t) => (
                <div key={t.id} className="bg-[var(--color-gold-50)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-gold-600)]">
                  ৳{t.amount} via {t.method} — waiting for admin verification
                </div>
              ))}
          </div>
        </div>
      )}

      <h2 className="font-display font-semibold text-[var(--color-ink-900)] mb-3">
        Transaction history
      </h2>
      {history.length === 0 ? (
        <p className="text-[var(--color-ink-500)] text-sm">No wallet activity yet.</p>
      ) : (
        <div className="bg-white rounded-[var(--radius-card)] shadow-card divide-y divide-[var(--color-border)]">
          {history.map((h) => (
            <div key={h.id} className="p-3.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-[var(--color-ink-900)]">
                  {h.type === "TOPUP" ? "Top-up" : h.type === "SPEND" ? "Purchase" : "Refund"}
                </p>
                <p className="text-xs text-[var(--color-ink-500)]">
                  {new Date(h.createdAt).toLocaleString()}
                  {h.note ? ` · ${h.note}` : ""}
                </p>
              </div>
              <span
                className={`font-medium ${Number(h.amount) >= 0 ? "text-[var(--color-emerald-700)]" : "text-[var(--color-ink-700)]"}`}
              >
                {Number(h.amount) >= 0 ? "+" : ""}৳{h.amount}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
