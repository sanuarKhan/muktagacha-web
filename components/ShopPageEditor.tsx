"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import ImageUploadField from "@/components/ImageUploadField";
import type { CloudinaryUploadSignature, Organization } from "@/lib/types";

const SITE_URL = "https://muktagacha.skodedigital.tech";

const input =
  "w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]";
const label = "block text-sm font-medium text-[var(--color-ink-700)] mb-1.5";

/**
 * The vendor's own shareable shop page, edited from their dashboard.
 * Replaces the old read-only "Shop profile" panel, which told vendors to
 * contact admin support for any change — they can now brand it themselves.
 */
export default function ShopPageEditor({ org, token }: { org: Organization; token: string }) {
  const [saved, setSaved] = useState<Organization>(org);
  const [form, setForm] = useState({
    name: org.name ?? "",
    slug: org.slug ?? "",
    tagline: org.tagline ?? "",
    description: org.description ?? "",
    logoUrl: org.logoUrl ?? "",
    bannerUrl: org.bannerUrl ?? "",
    facebookUrl: org.facebookUrl ?? "",
    whatsappNumber: org.whatsappNumber ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const approved = saved.approvalStatus === "APPROVED";
  const liveUrl = `${SITE_URL}/shop/${saved.slug || saved.id}`;
  const previewSlug = form.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function getUploadSignature(): Promise<CloudinaryUploadSignature> {
    return api.get<CloudinaryUploadSignature>(`/organizations/${org.id}/cloudinary/upload-signature`, token);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await api.patch<Organization>(
        `/organizations/${org.id}/shop-page`,
        {
          name: form.name,
          slug: form.slug,
          tagline: form.tagline || null,
          description: form.description || null,
          logoUrl: form.logoUrl || null,
          bannerUrl: form.bannerUrl || null,
          facebookUrl: form.facebookUrl || null,
          whatsappNumber: form.whatsappNumber || null,
        },
        token,
      );
      setSaved({ ...saved, ...updated });
      setForm((f) => ({ ...f, slug: updated.slug ?? f.slug }));
      setNotice("Saved. Your shop page is updated.");
    } catch (err) {
      const m = (err as { message?: string | string[] }).message;
      setError(Array.isArray(m) ? m[0] : m ?? "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard?.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const shareText = encodeURIComponent(`Visit ${saved.name} on Muktagacha: ${liveUrl}`);

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Share box */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-card p-5">
        <h3 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">Your shop link</h3>
        {approved ? (
          <>
            <p className="text-sm text-[var(--color-ink-500)] mt-1">
              Share this on Facebook, WhatsApp, or print it on your card. It shows only your products, under your name.
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <code className="flex-1 bg-[var(--color-cream-100)] rounded-[12px] px-4 py-2.5 text-sm text-[var(--color-ink-900)] break-all">
                {liveUrl}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="px-4 py-2.5 rounded-[12px] bg-[var(--color-emerald-700)] text-white text-sm font-medium hover:bg-[var(--color-emerald-900)]"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full border border-[var(--color-border)] text-sm text-[var(--color-ink-700)] hover:bg-[var(--color-cream-100)]">
                Open my shop ↗
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(liveUrl)}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full bg-[#1877F2] text-white text-sm hover:brightness-95">
                Share on Facebook
              </a>
              <a href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full bg-[#25D366] text-white text-sm hover:brightness-95">
                Share on WhatsApp
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--color-gold-600)] bg-[var(--color-gold-50)] rounded-lg px-3 py-2.5 mt-2">
            Your shop page goes live once an admin approves your shop. You can set it up now.
          </p>
        )}
      </div>

      {/* Editor */}
      <form onSubmit={save} className="bg-white rounded-[var(--radius-card)] shadow-card p-5 space-y-4">
        <h3 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">Shop page design</h3>

        <div>
          <label className={label}>Shop name</label>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} required />
        </div>

        <div>
          <label className={label}>Shop link</label>
          <div className="flex items-stretch">
            <span className="hidden sm:flex items-center px-3 rounded-l-[12px] border border-r-0 border-[var(--color-border)] bg-[var(--color-cream-100)] text-sm text-[var(--color-ink-500)]">
              …/shop/
            </span>
            <input
              className={`${input} sm:rounded-l-none`}
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="your-shop-name"
              maxLength={40}
              required
            />
          </div>
          <p className="text-xs text-[var(--color-ink-500)] mt-1">
            English letters, numbers and dashes. Will be: <strong>/shop/{previewSlug || "…"}</strong>
          </p>
        </div>

        <div>
          <label className={label}>
            Tagline <span className="font-normal text-[var(--color-ink-500)]">(one short line)</span>
          </label>
          <input
            className={input}
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            maxLength={120}
            placeholder="e.g. Pure cotton panjabi, made in Muktagacha"
          />
        </div>

        <div>
          <label className={label}>About your shop</label>
          <textarea
            className={`${input} min-h-[110px]`}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={2000}
            placeholder="What you sell, delivery areas, opening hours…"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Uploaded to Cloudinary (not stored as base64) so the images
              have real URLs — Facebook/WhatsApp link previews can only
              show an image that lives at a URL, never an inline blob. */}
          <ImageUploadField
            value={form.logoUrl}
            onChange={(url) => set("logoUrl", url)}
            label="Logo (square)"
            getUploadSignature={getUploadSignature}
          />
          <ImageUploadField
            value={form.bannerUrl}
            onChange={(url) => set("bannerUrl", url)}
            label="Banner (wide)"
            getUploadSignature={getUploadSignature}
          />
        </div>
        <p className="text-xs text-[var(--color-ink-500)] -mt-2">
          Banner looks best wide, around 1600 × 500. It also shows as the preview when your link is shared.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Facebook page</label>
            <input
              className={input}
              value={form.facebookUrl}
              onChange={(e) => set("facebookUrl", e.target.value)}
              placeholder="https://facebook.com/yourpage"
            />
          </div>
          <div>
            <label className={label}>WhatsApp number</label>
            <input
              className={input}
              value={form.whatsappNumber}
              onChange={(e) => set("whatsappNumber", e.target.value)}
              placeholder="01XXXXXXXXX"
              inputMode="tel"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {notice && <p className="text-sm text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2">{notice}</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-6 py-2.5 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save shop page"}
        </button>
      </form>
    </div>
  );
}
