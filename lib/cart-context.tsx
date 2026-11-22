"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Product, ProductVariant } from "./types";

export interface CartLine {
  product: Product;
  variant?: ProductVariant | null;
  quantity: number;
}

// A cart line is uniquely identified by product + variant (the same
// product can appear twice with two different sizes/colors).
function lineKey(productId: string, variantId?: string | null) {
  return `${productId}:${variantId ?? ""}`;
}

const STORAGE_KEY = "mk_cart_v1";
// Sensible ceiling for untracked ("always available") items.
export const MAX_PER_LINE = 50;

/** Most a customer can put in the cart for this line (stock-aware). */
export function maxQuantity(product: Product, variant?: ProductVariant | null): number {
  const stock = variant ? variant.stockCount : product.stockCount;
  if (stock === null || stock === undefined) return MAX_PER_LINE;
  return Math.max(0, Math.min(stock, MAX_PER_LINE));
}

export type AddResult = { ok: true } | { ok: false; reason: "limit"; max: number };

interface CartContextValue {
  lines: CartLine[];
  count: number;
  addItem: (product: Product, variant?: ProductVariant | null) => AddResult;
  removeItem: (productId: string, variantId?: string | null) => void;
  setQuantity: (productId: string, variantId: string | null | undefined, quantity: number) => void;
  clear: () => void;
  // Carts can span multiple vendors; checkout groups by organizationId
  // since each vendor fulfills their own sub-order independently.
  linesByOrganization: () => Record<string, CartLine[]>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const loaded = useRef(false);

  // Keep the cart across page refreshes (was memory-only before).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed)) {
          setLines(parsed.filter((l) => l?.product?.id && Number.isInteger(l.quantity) && l.quantity > 0));
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full / private mode — cart still works for this visit */
    }
  }, [lines]);

  function addItem(product: Product, variant?: ProductVariant | null): AddResult {
    const key = lineKey(product.id, variant?.id);
    const max = maxQuantity(product, variant);
    const existing = lines.find((l) => lineKey(l.product.id, l.variant?.id) === key);
    if ((existing?.quantity ?? 0) + 1 > max) return { ok: false, reason: "limit", max };
    setLines((prev) => {
      const ex = prev.find((l) => lineKey(l.product.id, l.variant?.id) === key);
      if (ex) {
        return prev.map((l) =>
          lineKey(l.product.id, l.variant?.id) === key
            ? { ...l, quantity: Math.min(l.quantity + 1, max) }
            : l,
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
    return { ok: true };
  }

  function removeItem(productId: string, variantId?: string | null) {
    const key = lineKey(productId, variantId);
    setLines((prev) =>
      prev.filter((l) => lineKey(l.product.id, l.variant?.id) !== key),
    );
  }

  function setQuantity(
    productId: string,
    variantId: string | null | undefined,
    quantity: number,
  ) {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }
    const key = lineKey(productId, variantId);
    setLines((prev) =>
      prev.map((l) =>
        lineKey(l.product.id, l.variant?.id) === key
          ? { ...l, quantity: Math.min(Math.floor(quantity), Math.max(1, maxQuantity(l.product, l.variant))) }
          : l,
      ),
    );
  }

  function clear() {
    setLines([]);
  }

  function linesByOrganization() {
    return lines.reduce<Record<string, CartLine[]>>((acc, line) => {
      const orgId = line.product.organizationId;
      acc[orgId] = acc[orgId] ? [...acc[orgId], line] : [line];
      return acc;
    }, {});
  }

  const count = lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <CartContext.Provider
      value={{ lines, count, addItem, removeItem, setQuantity, clear, linesByOrganization }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
