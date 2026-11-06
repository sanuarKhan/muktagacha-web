"use client";

import { useEffect, useMemo } from "react";
import type { Product, Organization } from "@/lib/types";

/**
 * Slide-out filter panel.
 *
 * UX decision — hidden by default, opened by a sticky button:
 * On a marketplace this small (a single town), a permanently visible
 * sidebar would eat ~25% of the screen to filter a handful of products,
 * and on mobile — which is how nearly everyone here browses — a fixed
 * sidebar simply doesn't fit. So the panel is summoned on demand and
 * overlays the page, the same pattern Daraz/Chaldal use on mobile.
 *
 * IMPORTANT — every filter below is backed by a real database field:
 *   shop   -> Organization.name
 *   area   -> Organization.area
 *   price  -> Product.basePrice
 *   rating -> Organization.avgRating
 * There is deliberately NO brand filter: the Product model has no brand
 * column, so a brand filter would be a permanently empty box.
 */

export type Filters = {
  shopIds: string[];
  areas: string[];
  minPrice: number | null;
  maxPrice: number | null;
  verifiedOnly: boolean;
  minRating: number | null;
};

export const EMPTY_FILTERS: Filters = {
  shopIds: [],
  areas: [],
  minPrice: null,
  maxPrice: null,
  verifiedOnly: false,
  minRating: null,
};

export function countActive(f: Filters): number {
  return (
    f.shopIds.length +
    f.areas.length +
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    (f.verifiedOnly ? 1 : 0) +
    (f.minRating !== null ? 1 : 0)
  );
}

/** Apply filters client-side. The product list for one town is small
 *  enough that filtering in the browser is instant and avoids a round
 *  trip per checkbox. */
export function applyFilters(products: Product[], f: Filters): Product[] {
  return products.filter((p) => {
    const org = p.organization;
    if (!org) {
      // A product with no shop attached can't satisfy any shop-based
      // filter; only let it through when no such filter is active.
      return (
        f.shopIds.length === 0 &&
        f.areas.length === 0 &&
        !f.verifiedOnly &&
        f.minRating === null
      );
    }

    if (f.shopIds.length && !f.shopIds.includes(org.id)) return false;
    if (f.areas.length && !(org.area && f.areas.includes(org.area))) return false;

    const price = Number(p.basePrice);
    if (f.minPrice !== null && price < f.minPrice) return false;
    if (f.maxPrice !== null && price > f.maxPrice) return false;

    if (f.verifiedOnly && org.verificationStatus !== "VERIFIED") return false;

    if (f.minRating !== null) {
      const r = org.avgRating === null || org.avgRating === undefined
        ? null
        : Number(org.avgRating);
      if (r === null || r < f.minRating) return false;
    }
    return true;
  });
}

export default function FilterPanel({
  open,
  onClose,
  products,
  filters,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  products: Product[];
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  // Options are derived from the products actually on the page, so a
  // filter can never offer a choice that yields zero results.
  const { shops, areas, priceMin, priceMax, anyVerified, anyRated } = useMemo(() => {
    const shopMap = new Map<string, string>();
    const areaSet = new Set<string>();
    const prices: number[] = [];
    let verified = false;
    let rated = false;

    for (const p of products) {
      const org: Organization | undefined = p.organization;
      if (org?.id && org?.name) shopMap.set(org.id, org.name);
      if (org?.area) areaSet.add(org.area);
      if (org?.verificationStatus === "VERIFIED") verified = true;
      if (org?.avgRating !== null && org?.avgRating !== undefined) rated = true;
      const n = Number(p.basePrice);
      if (!Number.isNaN(n)) prices.push(n);
    }
    return {
      shops: [...shopMap.entries()].map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      areas: [...areaSet].sort(),
      priceMin: prices.length ? Math.floor(Math.min(...prices)) : 0,
      priceMax: prices.length ? Math.ceil(Math.max(...prices)) : 0,
      anyVerified: verified,
      anyRated: rated,
    };
  }, [products]);

  // Escape closes; body scroll locks while the overlay is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const active = countActive(filters);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-[var(--color-ink-900)]/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Panel — slides in from the left, as requested */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filter products"
        className={`fixed left-0 top-0 bottom-0 z-50 w-[86vw] max-w-[340px] bg-[var(--color-cream-50)] shadow-elevated flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">
            Filters{active > 0 && (
              <span className="ml-2 text-xs font-medium text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] px-2 py-0.5 rounded-full align-middle">
                {active}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="w-9 h-9 rounded-full hover:bg-[var(--color-cream-100)] flex items-center justify-center text-[var(--color-ink-700)] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
          {/* Price */}
          {priceMax > 0 && (
            <Group title="Price range">
              <div className="flex items-center gap-2">
                <NumField
                  label="Min"
                  placeholder={`৳${priceMin}`}
                  value={filters.minPrice}
                  onChange={(v) => set({ minPrice: v })}
                />
                <span className="text-[var(--color-ink-300)] mt-5">—</span>
                <NumField
                  label="Max"
                  placeholder={`৳${priceMax}`}
                  value={filters.maxPrice}
                  onChange={(v) => set({ maxPrice: v })}
                />
              </div>
            </Group>
          )}

          {/* Area — real Organization.area values */}
          {areas.length > 0 && (
            <Group title="Area">
              <div className="flex flex-wrap gap-2">
                {areas.map((a) => (
                  <Chip
                    key={a}
                    label={a}
                    active={filters.areas.includes(a)}
                    onClick={() => set({ areas: toggle(filters.areas, a) })}
                  />
                ))}
              </div>
            </Group>
          )}

          {/* Shops */}
          {shops.length > 0 && (
            <Group title={`Shops (${shops.length})`}>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {shops.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 py-1 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={filters.shopIds.includes(s.id)}
                      onChange={() => set({ shopIds: toggle(filters.shopIds, s.id) })}
                      className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-emerald-700)]"
                    />
                    <span className="text-sm text-[var(--color-ink-700)] group-hover:text-[var(--color-ink-900)] truncate">
                      {s.name}
                    </span>
                  </label>
                ))}
              </div>
            </Group>
          )}

          {/*
            Trust filters are only rendered when at least one shop in the
            current result set actually has that data. Showing a "Verified
            only" switch when no shop is verified yet would just produce an
            empty page and look broken.
          */}
          {anyVerified && (
            <Group title="Trust">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-[var(--color-ink-700)]">
                  Verified shops only
                </span>
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) => set({ verifiedOnly: e.target.checked })}
                  className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-emerald-700)]"
                />
              </label>
            </Group>
          )}

          {anyRated && (
            <Group title="Rating">
              <div className="flex flex-wrap gap-2">
                {[4, 3, 2].map((r) => (
                  <Chip
                    key={r}
                    label={`${r}★ & up`}
                    active={filters.minRating === r}
                    onClick={() => set({ minRating: filters.minRating === r ? null : r })}
                  />
                ))}
              </div>
            </Group>
          )}
        </div>

        <footer className="shrink-0 border-t border-[var(--color-border)] px-5 py-4 flex gap-3">
          <button
            onClick={() => onChange(EMPTY_FILTERS)}
            disabled={active === 0}
            className="flex-1 py-2.5 rounded-[var(--radius-pill)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-ink-700)] hover:bg-[var(--color-cream-100)] disabled:opacity-40 transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-[var(--radius-pill)] bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors"
          >
            Show results
          </button>
        </footer>
      </aside>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-500)] mb-3">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1.5 rounded-[var(--radius-pill)] text-sm border transition-colors ${
        active
          ? "bg-[var(--color-emerald-700)] border-transparent text-[var(--color-cream-50)]"
          : "bg-white border-[var(--color-border)] text-[var(--color-ink-700)] hover:border-[var(--color-emerald-600)]"
      }`}
    >
      {label}
    </button>
  );
}

function NumField({
  label, placeholder, value, onChange,
}: {
  label: string;
  placeholder: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex-1">
      <span className="block text-xs text-[var(--color-ink-500)] mb-1">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Math.max(0, Number(raw)));
        }}
        className="w-full border border-[var(--color-border)] rounded-[10px] px-3 py-2 text-sm text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
      />
    </label>
  );
}
