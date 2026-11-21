"use client";

import { useState } from "react";
import { api } from "@/lib/api";

// Admin → All vendors: one shop row with full control.
//  - change status any way (approve / back to pending / reject with reason)
//  - edit basic details on the vendor's behalf
//  - delete (only if the shop has no orders, bookings or reviews)

type Shop = {
  id: string;
  name: string;
  slug?: string | null;
  vertical: string;
  area?: string | null;
  ward?: string | null;
  deliveryRadiusKm?: string | number | null;
  bkashNumber?: string | null;
  nagadNumber?: string | null;
  tagline?: string | null;
  description?: string | null;
  facebookUrl?: string | null;
  whatsappNumber?: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  approvalNote?: string | null;
  owner?: { fullName?: string; phone?: string } | null;
  _count?: { listings?: number; orders?: number; serviceRequests?: number; bookingSlots?: number; shopReviews?: number };
};

const BADGE: Record<string, string> = {
  APPROVED: "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]",
  PENDING: "bg-[var(--color-gold-50)] text-[var(--color-gold-600)]",
  REJECTED: "bg-red-50 text-red-600",
};

const errMsg = (e: any) => (Array.isArray(e?.message) ? e.message.join(", ") : e?.message) || "Something went wrong";
const field = "w-full rounded-lg border border-[var(--color-ink-200,#e5e5e0)] px-3 py-2 text-sm";

export default function AdminShopRow({ shop, token, onChanged }: { shop: Shop; token: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: shop.name,
    vertical: shop.vertical,
    area: shop.area ?? "",
    ward: shop.ward ?? "",
    deliveryRadiusKm: shop.deliveryRadiusKm != null ? String(shop.deliveryRadiusKm) : "",
    bkashNumber: shop.bkashNumber ?? "",
    nagadNumber: shop.nagadNumber ?? "",
    whatsappNumber: shop.whatsappNumber ?? "",
    facebookUrl: shop.facebookUrl ?? "",
    tagline: shop.tagline ?? "",
    description: shop.description ?? "",
  });
  const c = shop._count ?? {};
  const history = (c.orders ?? 0) + (c.serviceRequests ?? 0) + (c.bookingSlots ?? 0) + (c.shopReviews ?? 0);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      onChanged();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  function setStatus(status: Shop["approvalStatus"]) {
    let note: string | undefined;
    if (status === "REJECTED") {
      const r = window.prompt(`Why is "${shop.name}" being rejected? (the vendor sees this and can fix it)`, shop.approvalNote ?? "");
      if (r === null) return;
      note = r;
    }
    run(() => api.patch(`/organizations/${shop.id}/status`, { status, note }, token));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    run(async () => {
      await api.patch(
        `/organizations/${shop.id}/admin-edit`,
        { ...form, deliveryRadiusKm: form.deliveryRadiusKm.trim() === "" ? null : Number(form.deliveryRadiusKm) },
        token,
      );
      setEditing(false);
    });
  }

  function remove() {
    const msg = history > 0
      ? `"${shop.name}" has ${history} order(s)/booking(s)/review(s). Those records are kept, so the shop will be HIDDEN from the website (not erased).\nThe owner's account is not affected — use Users to delete the account.\n\nType DELETE to confirm.`
      : `Delete "${shop.name}" and its ${c.listings ?? 0} product(s) permanently?\nThe owner's account is not affected — use Users to delete the account.\n\nType DELETE to confirm.`;
    const typed = window.prompt(msg);
    if (typed !== "DELETE") return;
    run(() => api.delete(`/organizations/${shop.id}`, token));
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--color-ink-900)]">
            {shop.name}
            {shop.slug && shop.approvalStatus === "APPROVED" && (
              <a href={`/shop/${shop.slug}`} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs font-normal text-[var(--color-emerald-700)] underline">
                view shop
              </a>
            )}
          </p>
          <p className="text-sm text-[var(--color-ink-500)]">
            {shop.vertical} · {c.listings ?? 0} product(s) · {c.orders ?? 0} order(s)
            {shop.owner && <> · {shop.owner.fullName} · <a href={`tel:${shop.owner.phone}`} className="underline">{shop.owner.phone}</a></>}
          </p>
          {shop.approvalStatus === "REJECTED" && shop.approvalNote && (
            <p className="text-xs text-red-600 mt-1">Rejected: {shop.approvalNote}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${BADGE[shop.approvalStatus]}`}>{shop.approvalStatus}</span>
          <select
            aria-label="Change status"
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && setStatus(e.target.value as Shop["approvalStatus"])}
            className="text-sm rounded-[var(--radius-pill)] border border-[var(--color-ink-200,#e5e5e0)] px-3 py-1.5 bg-white"
          >
            <option value="">Change status…</option>
            {shop.approvalStatus !== "APPROVED" && <option value="APPROVED">Approve (go live)</option>}
            {shop.approvalStatus !== "PENDING" && <option value="PENDING">Back to pending</option>}
            <option value="REJECTED">{shop.approvalStatus === "REJECTED" ? "Update rejection reason" : "Reject / hide"}</option>
          </select>
          <button onClick={() => setEditing((v) => !v)} disabled={busy} className="text-sm px-3 py-1.5 rounded-[var(--radius-pill)] bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)] font-medium">
            {editing ? "Close" : "Edit"}
          </button>
          <button onClick={remove} disabled={busy} className="text-sm px-3 py-1.5 rounded-[var(--radius-pill)] bg-red-50 text-red-700 font-medium">
            Delete
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {editing && (
        <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2 border-t border-[var(--color-ink-100,#eee)] pt-4">
          <label className="text-sm">Shop name<input className={field} value={form.name} onChange={set("name")} required minLength={2} /></label>
          <label className="text-sm">Type
            <select className={field} value={form.vertical} onChange={set("vertical")}>
              <option value="MARKETPLACE">Marketplace</option>
              <option value="PHARMACY">Pharmacy</option>
              <option value="SERVICES">Services</option>
            </select>
          </label>
          <label className="text-sm">Area<input className={field} value={form.area} onChange={set("area")} /></label>
          <label className="text-sm">Ward<input className={field} value={form.ward} onChange={set("ward")} /></label>
          <label className="text-sm">Delivery radius (km)<input className={field} inputMode="decimal" value={form.deliveryRadiusKm} onChange={set("deliveryRadiusKm")} /></label>
          <label className="text-sm">WhatsApp<input className={field} value={form.whatsappNumber} onChange={set("whatsappNumber")} /></label>
          <label className="text-sm">bKash number<input className={field} value={form.bkashNumber} onChange={set("bkashNumber")} /></label>
          <label className="text-sm">Nagad number<input className={field} value={form.nagadNumber} onChange={set("nagadNumber")} /></label>
          <label className="text-sm sm:col-span-2">Facebook page link<input className={field} value={form.facebookUrl} onChange={set("facebookUrl")} /></label>
          <label className="text-sm sm:col-span-2">Tagline<input className={field} value={form.tagline} onChange={set("tagline")} /></label>
          <label className="text-sm sm:col-span-2">About the shop<textarea className={field} rows={3} value={form.description} onChange={set("description")} /></label>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={busy} className="bg-[var(--color-emerald-700)] text-white px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium disabled:opacity-50">
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-[var(--color-ink-500)]">Cancel</button>
          </div>
          <p className="sm:col-span-2 text-xs text-[var(--color-ink-500)]">
            Products are edited in the "Product catalog" tab. Logo, banner and shop link are edited from the vendor's shop page settings.
          </p>
        </form>
      )}
    </div>
  );
}
