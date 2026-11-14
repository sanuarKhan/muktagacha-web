"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import VariantPickerModal from "@/components/VariantPickerModal";
import type { Organization, Product } from "@/lib/types";

const SITE_URL = "https://muktagacha.skodedigital.tech";

/** wa.me needs international format with no "+": 01712345678 -> 8801712345678 */
function waLink(num: string, text: string) {
  const d = num.replace(/\D/g, "");
  const intl = d.startsWith("880") ? d : d.startsWith("0") ? `88${d}` : `880${d}`;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

export default function ShopStorefront({
  shop,
  products,
}: {
  shop: Organization;
  products: Product[];
}) {
  const { addItem, lines } = useCart();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<"new" | "low" | "high">("new");
  const [variantPicker, setVariantPicker] = useState<Product | null>(null);
  const [copied, setCopied] = useState(false);
  const [added, setAdded] = useState<string | null>(null);

  const shopUrl = `${SITE_URL}/shop/${shop.slug || shop.id}`;
  const cartCount = lines.reduce((n, l) => n + l.quantity, 0);

  // Only categories this shop actually sells — no empty filter chips.
  const categories = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => p.category && m.set(p.category.id, p.category.name));
    return [...m.entries()];
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter(
      (p) =>
        (category === "all" || p.category?.id === category) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.category?.name ?? "").toLowerCase().includes(q)),
    );
    if (sort === "low") return [...list].sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
    if (sort === "high") return [...list].sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
    return list;
  }, [products, query, category, sort]);

  function add(product: Product) {
    if (product.hasVariants && product.variants.length > 0) {
      setVariantPicker(product);
      return;
    }
    addItem(product, null);
    flashAdded(product.name);
  }

  function flashAdded(name: string) {
    setAdded(name);
    setTimeout(() => setAdded(null), 2200);
  }

  async function share() {
    // Native share sheet on phones (WhatsApp, Messenger, etc.); copy on desktop.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shop.name, text: shop.tagline ?? `Shop ${shop.name} on Muktagacha`, url: shopUrl });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    await navigator.clipboard?.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const verified = shop.verificationStatus === "VERIFIED";
  const rating = shop.avgRating ? Number(shop.avgRating) : null;

  return (
    <div className="min-h-screen bg-[var(--color-cream-50)]">
      {/* Banner */}
      <div className="relative h-44 sm:h-64 w-full bg-gradient-to-br from-[var(--color-emerald-700)] to-[var(--color-emerald-900)] overflow-hidden">
        {shop.bannerUrl && (
          <Image src={shop.bannerUrl} alt={`${shop.name} banner`} fill priority className="object-cover" unoptimized />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
      </div>

      {/* Shop header */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-14 sm:-mt-16 bg-white rounded-[var(--radius-card)] shadow-card p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:items-end">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 -mt-16 sm:-mt-20 rounded-2xl border-4 border-white bg-[var(--color-cream-100)] shadow-card overflow-hidden flex items-center justify-center shrink-0">
            {shop.logoUrl ? (
              <Image src={shop.logoUrl} alt={shop.name} fill className="object-cover" unoptimized />
            ) : (
              <span className="font-display text-4xl font-semibold text-[var(--color-emerald-700)]">
                {shop.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--color-ink-900)]">{shop.name}</h1>
              {verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]">
                  ✓ Verified
                </span>
              )}
            </div>
            {shop.tagline && <p className="text-[var(--color-ink-700)] mt-1">{shop.tagline}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[var(--color-ink-500)]">
              {(shop.area || shop.ward) && <span>📍 {[shop.area, shop.ward].filter(Boolean).join(", ")}</span>}
              {rating !== null && (
                <span>
                  ★ {rating.toFixed(1)} <span className="text-[var(--color-ink-300)]">({shop.reviewCount ?? 0})</span>
                </span>
              )}
              <span>
                {products.length} product{products.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {shop.whatsappNumber && (
              <a
                href={waLink(shop.whatsappNumber, `Hi ${shop.name}, I found your shop on Muktagacha.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-[var(--radius-pill)] bg-[#25D366] text-white text-sm font-medium hover:brightness-95"
              >
                WhatsApp
              </a>
            )}
            {shop.facebookUrl && (
              <a
                href={shop.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-[var(--radius-pill)] bg-[#1877F2] text-white text-sm font-medium hover:brightness-95"
              >
                Facebook
              </a>
            )}
            <button
              onClick={share}
              className="px-4 py-2 rounded-[var(--radius-pill)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-cream-100)]"
            >
              {copied ? "Link copied ✓" : "Share shop"}
            </button>
          </div>
        </div>

        {shop.description && (
          <p className="mt-5 text-[var(--color-ink-700)] leading-relaxed whitespace-pre-line max-w-3xl">{shop.description}</p>
        )}

        {/* Search + filters */}
        <div className="sticky top-0 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 mt-6 bg-[var(--color-cream-50)]/95 backdrop-blur">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search in ${shop.name}…`}
              className="flex-1 border border-[var(--color-border)] rounded-[var(--radius-pill)] px-5 py-2.5 bg-white text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="border border-[var(--color-border)] rounded-[var(--radius-pill)] px-4 py-2.5 bg-white text-sm text-[var(--color-ink-700)]"
            >
              <option value="new">Newest first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>
          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
              {[["all", "All"] as [string, string], ...categories].map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => setCategory(id)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    category === id
                      ? "bg-[var(--color-emerald-700)] border-[var(--color-emerald-700)] text-white"
                      : "bg-white border-[var(--color-border)] text-[var(--color-ink-700)] hover:border-[var(--color-emerald-600)]"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Products */}
        {visible.length === 0 ? (
          <div className="text-center py-16 text-[var(--color-ink-500)]">
            {products.length === 0 ? "This shop hasn't added products yet. Check back soon!" : "No products match your search."}
            {products.length > 0 && (query || category !== "all") && (
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                className="block mx-auto mt-3 text-sm font-medium text-[var(--color-emerald-700)] hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 pb-24">
            {visible.map((p) => (
              <div key={p.id} className="bg-white rounded-[var(--radius-card)] shadow-card overflow-hidden flex flex-col">
                <div className="relative aspect-square bg-[var(--color-cream-100)]">
                  {p.images?.[0]?.url ? (
                    <Image src={p.images[0].url} alt={p.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-3xl text-[var(--color-ink-300)]">🛍</div>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="font-medium text-sm sm:text-base text-[var(--color-ink-900)] line-clamp-2">{p.name}</h3>
                  {p.category?.name && <p className="text-xs text-[var(--color-ink-500)] mt-0.5">{p.category.name}</p>}
                  <div className="mt-auto pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--color-emerald-700)]">
                      {p.hasVariants ? "From " : ""}৳{p.basePrice}
                    </span>
                    <button
                      onClick={() => add(p)}
                      className="bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] px-3 py-1.5 rounded-[var(--radius-pill)] text-xs sm:text-sm font-medium hover:bg-[var(--color-emerald-900)]"
                    >
                      {p.hasVariants ? "Options" : "Add to cart"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating cart + "added" toast — keeps buyers in the shop's page */}
      {added && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-[var(--color-ink-900)] text-white text-sm px-4 py-2 rounded-full shadow-elevated">
          Added “{added}”
        </div>
      )}
      {cartCount > 0 && (
        <Link
          href="/checkout"
          className="fixed bottom-5 right-5 z-40 bg-[var(--color-emerald-700)] text-white px-5 py-3 rounded-full shadow-elevated font-medium hover:bg-[var(--color-emerald-900)]"
        >
          🛒 Checkout ({cartCount})
        </Link>
      )}

      <p className="text-center text-xs text-[var(--color-ink-300)] pb-8">
        Powered by{" "}
        <Link href="/" className="hover:text-[var(--color-emerald-700)]">
          Muktagacha
        </Link>
      </p>

      {variantPicker && (
        <VariantPickerModal
          product={variantPicker}
          onClose={() => setVariantPicker(null)}
          onSelect={(variant) => {
            addItem(variantPicker, variant);
            flashAdded(variantPicker.name);
            setVariantPicker(null);
          }}
        />
      )}
    </div>
  );
}
