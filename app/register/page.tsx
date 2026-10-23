"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    phone: "",
    password: "",
    fullName: "",
    role: "BUYER" as "BUYER" | "VENDOR",
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
      router.push(form.role === "VENDOR" ? "/vendor" : "/");
    } catch (err: any) {
      const msg = Array.isArray(err?.message)
        ? err.message.join(", ")
        : err?.message || "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-xl font-bold mb-6">Create an account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input
            required
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="w-full border border-neutral-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="tel"
            required
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-neutral-300 rounded-md px-3 py-2"
            placeholder="01XXXXXXXXX"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-neutral-300 rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            I want to...
          </label>
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as "BUYER" | "VENDOR" })
            }
            className="w-full border border-neutral-300 rounded-md px-3 py-2"
          >
            <option value="BUYER">Shop / order services</option>
            <option value="VENDOR">Sell products or offer services</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Ward</label>
          <input
            value={form.ward}
            onChange={(e) => setForm({ ...form, ward: e.target.value })}
            className="w-full border border-neutral-300 rounded-md px-3 py-2"
            placeholder="e.g. Ward 3"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 text-white rounded-md py-2 font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}
