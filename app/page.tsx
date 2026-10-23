"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import type { Listing } from "@/lib/types";
import Link from "next/link";

const CATEGORIES = ["All", "Clothing", "Cosmetics", "Groceries"];

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, lines } = useCart();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
    api
      .get<Listing[]>(`/listings${qs}`)
      .then(setListings)
      .catch(() => setError("Could not load listings. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shop Local in Muktagacha</h1>
          <p className="text-neutral-500 text-sm">
            Real shops, real neighbors — ordered straight to your door.
          </p>
        </div>
        {lines.length > 0 && (
          <Link
            href="/checkout"
            className="bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-emerald-700"
          >
            Cart ({lines.reduce((n, l) => n + l.quantity, 0)})
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              category === c
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-neutral-700 border-neutral-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && <p className="text-neutral-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && listings.length === 0 && (
        <p className="text-neutral-500">
          No listings yet in this category. Check back soon!
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col"
          >
            <div className="text-xs text-neutral-400 mb-1">
              {listing.organization?.name ?? "Local vendor"}
            </div>
            <h3 className="font-semibold mb-1">{listing.name}</h3>
            <p className="text-neutral-500 text-sm mb-3">
              {listing.category}
            </p>
            <div className="mt-auto flex items-center justify-between">
              <span className="font-bold text-emerald-700">
                ৳{listing.price}
              </span>
              <button
                onClick={() => addItem(listing)}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-emerald-700"
              >
                Add to cart
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
