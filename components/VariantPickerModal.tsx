"use client";

import type { Product, ProductVariant } from "@/lib/types";

// Shared by the homepage and the public shop page so both pick variants
// (size, colour…) the same way.
export default function VariantPickerModal({
  product,
  onClose,
  onSelect,
}: {
  product: Product;
  onClose: () => void;
  onSelect: (variant: ProductVariant) => void;
}) {
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
          Choose an option
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {product.variants
            .filter((v) => v.isActive && v.stockCount > 0)
            .map((v) => (
              <button
                key={v.id}
                onClick={() => onSelect(v)}
                className="w-full flex items-center justify-between border border-[var(--color-border)] rounded-[12px] px-4 py-3 text-left hover:border-[var(--color-emerald-600)] hover:bg-[var(--color-emerald-50)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--color-ink-900)]">
                  {Object.entries(v.optionValues)
                    .map(([, val]) => val)
                    .join(" / ")}
                </span>
                <span className="text-sm font-semibold text-[var(--color-emerald-700)]">
                  ৳{v.priceOverride ?? product.basePrice}
                </span>
              </button>
            ))}
          {product.variants.filter((v) => v.isActive && v.stockCount > 0)
            .length === 0 && (
            <p className="text-sm text-[var(--color-ink-500)]">
              Out of stock right now.
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 text-sm text-[var(--color-ink-500)] w-full text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
