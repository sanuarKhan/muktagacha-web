import type { Product, ProductVariant } from "@/lib/types";

// One place that decides what a customer sees about stock.
// stockCount null/undefined = not tracked → always available.
export const LOW_STOCK = 3;

export function activeVariants(p: Product): ProductVariant[] {
  return (p.variants ?? []).filter((v) => v.isActive);
}

/** Product uses the size/colour picker only if it really has options. */
export function usesOptions(p: Product): boolean {
  return p.hasVariants && activeVariants(p).length > 0;
}

export function variantSoldOut(v: ProductVariant): boolean {
  return v.stockCount !== null && v.stockCount !== undefined && v.stockCount <= 0;
}

/** "Only 2 left" — null when not tracked or plenty left. */
export function lowLeft(stock: number | null | undefined): number | null {
  return stock !== null && stock !== undefined && stock > 0 && stock <= LOW_STOCK ? stock : null;
}

export function productSoldOut(p: Product): boolean {
  if (usesOptions(p)) return activeVariants(p).every(variantSoldOut);
  return p.stockCount !== null && p.stockCount !== undefined && p.stockCount <= 0;
}

/** Badge for a product card. */
export function productStockBadge(p: Product): string | null {
  if (productSoldOut(p)) return "Sold out";
  if (!usesOptions(p)) {
    const n = lowLeft(p.stockCount);
    return n ? `Only ${n} left` : null;
  }
  return null;
}
