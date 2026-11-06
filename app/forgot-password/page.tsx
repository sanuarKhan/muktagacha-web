"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";

/**
 * Password reset, two steps on one page.
 *
 * Why SMS code and not an email link: accounts on this platform are
 * identified by PHONE NUMBER — there is no email field on the User model at
 * all — and httpSMS is already wired up for order notifications. An emailed
 * reset link would require collecting an email we don't have.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ ok: boolean; message: string }>(
        "/auth/forgot-password",
        { phone },
      );
      // The backend intentionally returns the same message whether or not
      // the number is registered, so we show it verbatim rather than
      // claiming "code sent!" (which would leak that the account exists).
      setNotice(res.message);
      setStep("verify");
    } catch (err: any) {
      setError(
        typeof err?.message === "string"
          ? err.message
          : "Could not send the code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { phone, code, newPassword });
      setDone(true);
      setTimeout(() => router.push("/login"), 2200);
    } catch (err: any) {
      const m = err?.message;
      setError(
        typeof m === "string"
          ? m
          : Array.isArray(m)
            ? m[0]
            : "That code was not accepted. Please check and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]";

  if (done) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--color-cream-100)] px-5">
        <div className="w-full max-w-sm bg-white rounded-[var(--radius-card)] shadow-elevated p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] mb-1">
            Password updated
          </h1>
          <p className="text-[var(--color-ink-500)] text-sm">
            Taking you to the login page…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--color-cream-100)] px-5">
      <div className="w-full max-w-sm bg-white rounded-[var(--radius-card)] shadow-elevated p-8">
        <div className="flex justify-center mb-5">
          <Image
            src="/logo-icon.png"
            alt="Muktagacha"
            width={56}
            height={56}
            className="h-14 w-14 object-contain"
          />
        </div>

        <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)] mb-1 text-center">
          {step === "request" ? "Forgot password?" : "Enter your code"}
        </h1>
        <p className="text-[var(--color-ink-500)] text-sm mb-6 text-center">
          {step === "request"
            ? "Enter your mobile number and we'll text you a reset code."
            : `We sent a 6-digit code to ${phone}.`}
        </p>

        {step === "request" ? (
          <form onSubmit={requestCode} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                required
                autoFocus
                value={phone}
                onChange={(e) => setPhone(e.target.value.trim())}
                className={inputCls}
                placeholder="01XXXXXXXXX"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] rounded-[var(--radius-pill)] py-3 font-medium hover:bg-[var(--color-emerald-900)] transition-colors disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send reset code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitNewPassword} className="space-y-4">
            {notice && (
              <p className="text-sm text-[var(--color-ink-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2">
                {notice}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                6-digit code
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                autoFocus
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className={`${inputCls} tracking-[0.5em] text-center text-lg font-semibold`}
                placeholder="000000"
              />
              <p className="text-xs text-[var(--color-ink-500)] mt-1.5">
                The code expires in 10 minutes.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`${inputCls} pr-12`}
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)]"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] rounded-[var(--radius-pill)] py-3 font-medium hover:bg-[var(--color-emerald-900)] transition-colors disabled:opacity-50"
            >
              {loading ? "Updating…" : "Set new password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("request");
                setCode("");
                setError(null);
                setNotice(null);
              }}
              className="w-full text-sm text-[var(--color-ink-500)] hover:text-[var(--color-ink-900)] transition-colors"
            >
              Use a different number
            </button>
          </form>
        )}

        <p className="text-sm text-[var(--color-ink-500)] text-center mt-6">
          Remembered it?{" "}
          <Link
            href="/login"
            className="text-[var(--color-emerald-700)] font-medium hover:underline"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
