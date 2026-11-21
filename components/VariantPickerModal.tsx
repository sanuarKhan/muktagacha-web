"use client";

import type { Product, ProductVariant } from "@/lib/types";
import { activeVariants, variantSoldOut, lowLeft } from "@/lib/stock";

// Shared by the homepage and the public shop page so both pick variants
// (size, colour…) the same way. Every option is shown: sold-out ones are
// greyed out with "Sold out" (instead of silently disappearing), and
// low-stock ones say "Only N left".
export default function VariantPickerModal({
  product,
  onClose,
  onSelect,
}: {
  product: Product;
  onClose: () => void;
  onSelect: (variant: ProductVariant) => void;
}) {
  const options = activeVariants(product);
  const allSoldOut = options.length > 0 && options.every(variantSoldOut);

  return (
    <div
      className="fixed inset-0 bg-[var(--color-ink-900)]/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[var(--radius-card)] shadow-elevated max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)] mb-1">
          {product.name}
        </h3>
        <p className="text-sm text-[var(--color-ink-500)] mb-4">
          {allSoldOut ? "All options are sold out right now." : "Choose an option"}
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {options.map((v) => {
            const soldOut = variantSoldOut(v);
            const left = lowLeft(v.stockCount);
            const label = Object.values(v.optionValues ?? {}).join(" / ") || "Option";
            return (
              <button
                key={v.id}
                onClick={() => !soldOut && onSelect(v)}
                disabled={soldOut}
                aria-disabled={soldOut}
                className={`w-full flex items-center justify-between gap-3 border rounded-[12px] px-4 py-3 text-left transition-colors ${
                  soldOut
                    ? "border-[var(--color-border)] bg-[var(--color-cream-100)] opacity-60 cursor-not-allowed"
                    : "border-[var(--color-border)] hover:border-[var(--color-emerald-600)] hover:bg-[var(--color-emerald-50)]"
                }`}
              >
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${soldOut ? "text-[var(--color-ink-500)] line-through" : "text-[var(--color-ink-900)]"}`}>
                    {label}
                  </span>
                  {soldOut ? (
                    <span className="block text-[11px] font-medium text-red-700">Sold out</span>
                  ) : left ? (
                    <span className="block text-[11px] font-medium text-[var(--color-gold-600)]">Only {left} left</span>
                  ) : null}
                </span>
                <span className={`text-sm font-semibold shrink-0 ${soldOut ? "text-[var(--color-ink-500)]" : "text-[var(--color-emerald-700)]"}`}>
                  ৳{v.priceOverride ?? product.basePrice}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="mt-4 text-sm text-[var(--color-ink-500)] w-full text-center"
        >
          {allSoldOut ? "Close" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
