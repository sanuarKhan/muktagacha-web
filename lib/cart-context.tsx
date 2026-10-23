"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { Listing } from "./types";

export interface CartLine {
  listing: Listing;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  addItem: (listing: Listing) => void;
  removeItem: (listingId: string) => void;
  setQuantity: (listingId: string, quantity: number) => void;
  clear: () => void;
  // Carts can span multiple vendors; checkout groups by organizationId
  // since each vendor fulfills their own sub-order independently.
  linesByOrganization: () => Record<string, CartLine[]>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  function addItem(listing: Listing) {
    setLines((prev) => {
      const existing = prev.find((l) => l.listing.id === listing.id);
      if (existing) {
        return prev.map((l) =>
          l.listing.id === listing.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { listing, quantity: 1 }];
    });
  }

  function removeItem(listingId: string) {
    setLines((prev) => prev.filter((l) => l.listing.id !== listingId));
  }

  function setQuantity(listingId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(listingId);
      return;
    }
    setLines((prev) =>
      prev.map((l) => (l.listing.id === listingId ? { ...l, quantity } : l)),
    );
  }

  function clear() {
    setLines([]);
  }

  function linesByOrganization() {
    return lines.reduce<Record<string, CartLine[]>>((acc, line) => {
      const orgId = line.listing.organizationId;
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
