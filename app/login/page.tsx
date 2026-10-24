"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
      router.push("/");
    } catch (err: any) {
      setError(
        typeof err?.message === "string"
          ? err.message
          : "Invalid phone or password",
      );
    } finally {
      setLoading(false);
    }
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
          Welcome back
        </h1>
        <p className="text-[var(--color-ink-500)] text-sm mb-6 text-center">
          Log in to your Muktagacha account.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink-700)] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
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
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="text-sm text-[var(--color-ink-500)] text-center mt-6">
          New here?{" "}
          <Link
            href="/register"
            className="text-[var(--color-emerald-700)] font-medium hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
