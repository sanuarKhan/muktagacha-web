"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Lets a vendor connect THEIR OWN Android phone to the SMS gateway.
 *
 * Why each vendor needs their own phone:
 *  - Customers see the shop's real number, not an unknown one
 *  - The cost lands on the vendor's own SIM bundle (free for the platform)
 *  - Volume spreads across many phones instead of one, so no carrier flags
 *    the platform number as a spam source
 *
 * The password is write-only: it is encrypted server-side and never sent
 * back to the browser, so this component can show connection status but
 * can never re-display the secret.
 */

type Status = {
  connected: boolean;
  phone: string | null;
  linkedAt: string | null;
  online: boolean;
  message: string;
};

const GATEWAY_URL =
  process.env.NEXT_PUBLIC_SMS_GATEWAY_URL ?? "https://sms-gw.sanurkhan.tech";

export default function VendorSmsPhone({
  orgId,
  token,
}: {
  orgId: string;
  token: string;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const s = await api.get<Status>(
        `/organizations/${orgId}/marketing/sms-phone`,
        token,
      );
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await api.post(
        `/organizations/${orgId}/marketing/sms-phone`,
        { login: login.trim(), password: password.trim(), phone: phone.trim() },
        token,
      );
      setLogin("");
      setPassword("");
      setPhone("");
      setShowForm(false);
      await refresh();
    } catch (err: any) {
      const m = err?.message;
      setError(
        typeof m === "string"
          ? m
          : Array.isArray(m)
            ? m[0]
            : "Could not connect. Check the username and password.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect this phone? You won't be able to send campaigns until you connect one again.")) return;
    setSaving(true);
    try {
      await api.delete(`/organizations/${orgId}/marketing/sms-phone`, token);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white shadow-card p-6 mb-6">
        <p className="text-sm text-[var(--color-ink-500)]">Checking your SMS phone…</p>
      </div>
    );
  }

  const connected = status?.connected ?? false;
  const online = status?.online ?? false;

  return (
    <div className="rounded-[var(--radius-card)] bg-white shadow-card p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">
            Your SMS phone
          </h3>
          <p className="text-sm text-[var(--color-ink-500)] mt-1 leading-relaxed">
            Campaigns are sent from your own phone and your own number, so
            customers recognise you. There is no charge from us — it uses your
            normal SIM.
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            connected && online
              ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]"
              : connected
                ? "bg-amber-50 text-amber-700"
                : "bg-[var(--color-cream-100)] text-[var(--color-ink-500)]"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              connected && online
                ? "bg-[var(--color-emerald-600)]"
                : connected
                  ? "bg-amber-500"
                  : "bg-[var(--color-ink-300)]"
            }`}
          />
          {connected ? (online ? "Connected" : "Not responding") : "Not set up"}
        </span>
      </div>

      {connected ? (
        <>
          <div className="rounded-[12px] bg-[var(--color-cream-100)] px-4 py-3 text-sm text-[var(--color-ink-700)] mb-4">
            {status?.phone && (
              <p className="mb-1">
                Sending from <strong>{status.phone}</strong>
              </p>
            )}
            <p className="text-[var(--color-ink-500)]">{status?.message}</p>
          </div>

          {!online && (
            // The most common real failure: the phone is linked but Android
            // has put the app to sleep, so messages silently stop going out.
            <div className="rounded-[12px] bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 mb-4 leading-relaxed">
              <strong>Your phone isn&apos;t responding.</strong> Open the SMS
              Gateway app on that phone and make sure it is on, charged and
              connected to the internet. Also allow the app to run in the
              background, or Android will stop it.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={refresh}
              className="px-4 py-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-cream-100)] transition-colors"
            >
              Check again
            </button>
            <button
              onClick={disconnect}
              disabled={saving}
              className="px-4 py-2 rounded-[var(--radius-pill)] border border-rose-200 text-sm font-medium text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              Disconnect
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="rounded-[12px] bg-[var(--color-cream-100)] px-4 py-3 text-sm text-[var(--color-ink-700)] mb-4 leading-relaxed">
            You need to connect a phone before you can send campaigns to your
            customers.
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-5 py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors"
            >
              {showForm ? "Cancel" : "Connect my phone"}
            </button>
            <button
              onClick={() => setShowGuide((v) => !v)}
              className="px-5 py-2.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-cream-100)] transition-colors"
            >
              {showGuide ? "Hide steps" : "How do I do this?"}
            </button>
          </div>
        </>
      )}

      {showGuide && (
        <ol className="mt-5 space-y-3 text-sm text-[var(--color-ink-700)] leading-relaxed list-decimal pl-5">
          <li>
            On the phone you want to send from, install the{" "}
            <strong>SMS Gateway</strong> app from{" "}
            <a
              href="https://github.com/capcom6/android-sms-gateway/releases/latest"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-emerald-700)] font-medium hover:underline"
            >
              this link
            </a>{" "}
            (choose <code>app-release.apk</code>).
          </li>
          <li>
            Android may warn you about installing it. Tap{" "}
            <strong>More details → Install anyway</strong>. You may need to turn
            off Play Protect scanning first, then turn it back on after.
          </li>
          <li>
            Open the app and <strong>allow SMS permission</strong> when asked.
          </li>
          <li>
            Turn on <strong>Cloud server</strong>, open its settings, and enter:
            <div className="mt-2 rounded-[10px] bg-[var(--color-cream-100)] p-3 font-mono text-xs break-all">
              <div className="mb-1">
                <span className="text-[var(--color-ink-500)]">API URL: </span>
                {GATEWAY_URL}/api/mobile/v1
              </div>
              <div>
                <span className="text-[var(--color-ink-500)]">Token: </span>
                SKODE_DEV_REG_TOKEN_2026
              </div>
            </div>
          </li>
          <li>
            Set <strong>Notification channel</strong> to{" "}
            <strong>SSE Only</strong>.{" "}
            <em>Do this before you start the service</em> — otherwise messages
            can take 15 minutes to send.
          </li>
          <li>
            Tap <strong>Start Service</strong>. The app will show a{" "}
            <strong>Username</strong> and <strong>Password</strong> — copy those
            into the form here.
          </li>
          <li>
            Finally, allow the app to run in the background (battery settings),
            or Android will close it and your messages will stop.
          </li>
        </ol>
      )}

      {showForm && (
        <form onSubmit={connect} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
              Username from the app
            </label>
            <input
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="e.g. W5UG2S"
              className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
              Password from the app
            </label>
            <input
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
              Your sending number{" "}
              <span className="font-normal text-[var(--color-ink-500)]">
                (optional)
              </span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
            />
          </div>

          {error && (
            <p className="text-sm text-rose-700 bg-rose-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-[var(--radius-pill)] bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] font-medium hover:bg-[var(--color-emerald-900)] transition-colors disabled:opacity-50"
          >
            {saving ? "Checking…" : "Connect phone"}
          </button>
        </form>
      )}
    </div>
  );
}
