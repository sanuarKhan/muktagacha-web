"use client";

import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";
import { LOW_STOCK } from "@/lib/stock";

// Vendor → Stock: every product and size/colour in one list, with + / −,
// an exact number, or "Always available". Sold-out and low-stock first.
type Row = {
  key: string;
  product: Product;
  variantId?: string;
  label: string;
  stock: number | null;
};

function statusOf(stock: number | null) {
  if (stock === null) return { t: "Always available", c: "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]", rank: 3 };
  if (stock <= 0) return { t: "Sold out", c: "bg-red-50 text-red-700", rank: 0 };
  if (stock <= LOW_STOCK) return { t: "Low stock", c: "bg-[var(--color-gold-50)] text-[var(--color-gold-600)]", rank: 1 };
  return { t: "In stock", c: "bg-[var(--color-cream-100)] text-[var(--color-ink-700)]", rank: 2 };
}

export default function StockTab({
  token,
  products,
  setProducts,
}: {
  token: string;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}) {
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const p of products.filter((x) => x.isActive)) {
      const opts = (p.variants ?? []).filter((v) => v.isActive);
      if (p.hasVariants && opts.length) {
        for (const v of opts) {
          out.push({
            key: v.id,
            product: p,
            variantId: v.id,
            label: Object.values(v.optionValues ?? {}).join(" / ") || "Option",
            stock: v.stockCount ?? null,
          });
        }
      } else {
        out.push({ key: p.id, product: p, label: "", stock: p.stockCount ?? null });
      }
    }
    return out.sort((a, b) => statusOf(a.stock).rank - statusOf(b.stock).rank || a.product.name.localeCompare(b.product.name));
  }, [products]);

  const soldOut = rows.filter((r) => r.stock !== null && r.stock <= 0).length;
  const low = rows.filter((r) => r.stock !== null && r.stock > 0 && r.stock <= LOW_STOCK).length;
  const shown = filter === "attention" ? rows.filter((r) => statusOf(r.stock).rank <= 1) : rows;

  async function change(r: Row, body: { delta?: number; set?: number | null }) {
    setBusy(r.key);
    setError("");
    try {
      const updated = await api.patch<Product>(`/products/${r.product.id}/stock`, { variantId: r.variantId, ...body }, token);
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
    } catch (e: any) {
      setError((Array.isArray(e?.message) ? e.message[0] : e?.message) || "Could not update stock");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[var(--color-ink-900)] mb-1">Stock</h2>
      <p className="text-sm text-[var(--color-ink-500)] mb-4">
        Update how many pieces you have. Customers see <b>Sold out</b> at 0 and <b>Only N left</b> at {LOW_STOCK} or fewer.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-3">
          <p className="text-[11px] text-[var(--color-ink-500)]">Items</p>
          <p className="text-xl font-semibold text-[var(--color-ink-900)]">{rows.length}</p>
        </div>
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-3">
          <p className="text-[11px] text-[var(--color-ink-500)]">Low stock</p>
          <p className="text-xl font-semibold text-[var(--color-gold-600)]">{low}</p>
        </div>
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-3">
          <p className="text-[11px] text-[var(--color-ink-500)]">Sold out</p>
          <p className="text-xl font-semibold text-red-700">{soldOut}</p>
        </div>
      </div>

      <div className="flex gap-1.5 mb-3">
        {(["all", "attention"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full ${filter === f ? "bg-[var(--color-emerald-700)] text-white" : "bg-white text-[var(--color-ink-500)]"}`}
          >
            {f === "all" ? "All items" : `Needs attention (${soldOut + low})`}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {shown.length === 0 && (
        <p className="text-sm text-[var(--color-ink-500)]">{filter === "attention" ? "Nothing is low or sold out. 👍" : "No products yet."}</p>
      )}

      <div className="space-y-2 pb-24">
        {shown.map((r) => {
          const st = statusOf(r.stock);
          const isBusy = busy === r.key;
          return (
            <div key={r.key} className="bg-white rounded-[var(--radius-card)] shadow-card p-3 flex flex-wrap items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-[var(--color-cream-100)] overflow-hidden shrink-0">
                {r.product.images?.[0]?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.product.images[0].url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-[8rem]">
                <p className="text-sm font-medium text-[var(--color-ink-900)] truncate">{r.product.name}</p>
                <p className="text-xs text-[var(--color-ink-500)] flex items-center gap-2 flex-wrap">
                  {r.label && <span>{r.label}</span>}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${st.c}`}>{st.t}</span>
                </p>
              </div>

              {editing === r.key ? (
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    autoFocus
                    aria-label="Exact number of pieces"
                    className="w-20 border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-sm"
                  />
                  <button
                    disabled={isBusy || draft.trim() === "" || !(Number(draft) >= 0)}
                    onClick={() => change(r, { set: Math.floor(Number(draft)) })}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--color-emerald-700)] text-white disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => change(r, { set: null })}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-ink-700)]"
                  >
                    Always available
                  </button>
                  <button onClick={() => setEditing(null)} className="text-xs text-[var(--color-ink-500)] px-1">
                    Cancel
                  </button>
                </div>
              ) : r.stock === null ? (
                <button
                  onClick={() => {
                    setEditing(r.key);
                    setDraft("");
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-[var(--color-border)] text-[var(--color-ink-700)]"
                >
                  Start counting
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={isBusy || r.stock <= 0}
                    onClick={() => change(r, { delta: -1 })}
                    aria-label={`One less ${r.product.name} ${r.label}`}
                    className="w-8 h-8 rounded-full border border-[var(--color-border)] text-lg leading-none disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    onClick={() => {
                      setEditing(r.key);
                      setDraft(String(r.stock));
                    }}
                    title="Type an exact number"
                    className="min-w-[2.5rem] text-center font-semibold text-[var(--color-ink-900)] underline decoration-dotted underline-offset-4"
                  >
                    {isBusy ? "…" : r.stock}
                  </button>
                  <button
                    disabled={isBusy}
                    onClick={() => change(r, { delta: 1 })}
                    aria-label={`One more ${r.product.name} ${r.label}`}
                    className="w-8 h-8 rounded-full bg-[var(--color-emerald-700)] text-white text-lg leading-none disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
