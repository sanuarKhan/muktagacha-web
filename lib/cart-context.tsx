"use client";

import {
  createContext,
  useContext,
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

interface CartContextValue {
  lines: CartLine[];
  addItem: (product: Product, variant?: ProductVariant | null) => void;
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

  function addItem(product: Product, variant?: ProductVariant | null) {
    const key = lineKey(product.id, variant?.id);
    setLines((prev) => {
      const existing = prev.find(
        (l) => lineKey(l.product.id, l.variant?.id) === key,
      );
      if (existing) {
        return prev.map((l) =>
          lineKey(l.product.id, l.variant?.id) === key
            ? { ...l, quantity: l.quantity + 1 }
            : l,
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
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
        lineKey(l.product.id, l.variant?.id) === key ? { ...l, quantity } : l,
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

  return (
    <CartContext.Provider
      value={{ lines, addItem, removeItem, setQuantity, clear, linesByOrganization }}
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
