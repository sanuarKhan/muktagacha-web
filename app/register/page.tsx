"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    phone: "",
    password: "",
    fullName: "",
    role: "BUYER" as "BUYER" | "VENDOR" | "RIDER",
    area: "Muktagacha",
    ward: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(form);
      router.push(
        form.role === "VENDOR" ? "/vendor" : form.role === "RIDER" ? "/rider" : "/",
      );
    } catch (err: any) {
      const msg = Array.isArray(err?.message)
        ? err.message.join(", ")
        : err?.message || "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]";
  const labelClass =
    "block text-sm font-medium text-[var(--color-ink-700)] mb-1.5";

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-[var(--color-cream-100)] px-5 py-10">
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
          Join Muktagacha
        </h1>
        <p className="text-[var(--color-ink-500)] text-sm mb-6 text-center">
          Shop from local vendors or start selling.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={inputClass}
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>I want to...</label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as "BUYER" | "VENDOR" | "RIDER" })
              }
              className={inputClass}
            >
              <option value="BUYER">Shop / order services</option>
              <option value="VENDOR">Sell products or offer services</option>
              <option value="RIDER">Deliver orders (become a rider)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Ward</label>
            <input
              value={form.ward}
              onChange={(e) => setForm({ ...form, ward: e.target.value })}
              className={inputClass}
              placeholder="e.g. Ward 3"
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
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="text-sm text-[var(--color-ink-500)] text-center mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--color-emerald-700)] font-medium hover:underline"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
