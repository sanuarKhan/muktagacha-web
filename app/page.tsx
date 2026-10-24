"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import type { Listing } from "@/lib/types";

const CATEGORIES = [
  {
    label: "All",
    value: "All",
  },
  {
    label: "Groceries",
    value: "Groceries",
    image:
      "https://images.pexels.com/photos/35000204/pexels-photo-35000204.jpeg?auto=compress&cs=tinysrgb&h=600&w=800",
  },
  {
    label: "Clothing",
    value: "Clothing",
    image:
      "https://images.pexels.com/photos/36890954/pexels-photo-36890954.jpeg?auto=compress&cs=tinysrgb&h=600&w=800",
  },
  {
    label: "Cosmetics",
    value: "Cosmetics",
    image:
      "https://images.pexels.com/photos/34643810/pexels-photo-34643810.jpeg?auto=compress&cs=tinysrgb&h=600&w=800",
  },
];

export default function HomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, lines } = useCart();

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs =
      category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
    api
      .get<Listing[]>(`/listings${qs}`)
      .then(setListings)
      .catch(() =>
        setError("Could not load listings. Is the backend running?"),
      )
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/37819283/pexels-photo-37819283.jpeg?auto=compress&cs=tinysrgb&h=1200&w=1600"
            alt="A busy street in Dhaka, Bangladesh"
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink-900)]/80 via-[var(--color-ink-900)]/30 to-[var(--color-ink-900)]/10" />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <p className="text-[var(--color-gold-400)] font-medium text-sm tracking-wide uppercase mb-3">
            Your neighborhood, online
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold text-[var(--color-cream-50)] max-w-xl leading-[1.08]">
            Shop local in Muktagacha
          </h1>
          <p className="text-[var(--color-cream-100)]/90 text-base sm:text-lg mt-5 max-w-md">
            Real shops, real neighbors — groceries, clothing, and more,
            ordered straight to your door.
          </p>
          <div className="mt-8 flex gap-3">
            <a
              href="#browse"
              className="bg-[var(--color-gold-500)] text-[var(--color-ink-900)] px-6 py-3 rounded-[var(--radius-pill)] font-medium hover:bg-[var(--color-gold-400)] transition-colors"
            >
              Start browsing
            </a>
            <Link
              href="/register"
              className="bg-[var(--color-cream-50)]/10 text-[var(--color-cream-50)] border border-[var(--color-cream-50)]/30 px-6 py-3 rounded-[var(--radius-pill)] font-medium hover:bg-[var(--color-cream-50)]/20 transition-colors backdrop-blur-sm"
            >
              Sell on Muktagacha
            </Link>
          </div>
        </div>
      </section>

      <div id="browse" className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
        {/* Category cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-12">
          {CATEGORIES.filter((c) => c.image).map((c) => (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={`group relative aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden shadow-card hover:shadow-hover-card transition-all ${
                category === c.value
                  ? "ring-2 ring-[var(--color-emerald-600)] ring-offset-2 ring-offset-[var(--color-cream-50)]"
                  : ""
              }`}
            >
              <Image
                src={c.image!}
                alt={c.label}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 640px) 33vw, 200px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink-900)]/70 via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 text-[var(--color-cream-50)] font-display font-semibold text-sm sm:text-lg">
                {c.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">
              {category === "All" ? "All products" : category}
            </h2>
            <p className="text-[var(--color-ink-500)] text-sm mt-1">
              {listings.length} item{listings.length === 1 ? "" : "s"} from
              local vendors
            </p>
          </div>
          {category !== "All" && (
            <button
              onClick={() => setCategory("All")}
              className="text-sm text-[var(--color-emerald-700)] font-medium hover:underline"
            >
              Clear filter
            </button>
          )}
          {lines.length > 0 && (
            <Link
              href="/checkout"
              className="bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] px-4 py-2.5 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors shadow-card"
            >
              Cart ({lines.reduce((n, l) => n + l.quantity, 0)})
            </Link>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-[var(--radius-card)] bg-[var(--color-cream-100)] animate-pulse"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-[var(--radius-card)] bg-[var(--color-gold-50)] border border-[var(--color-gold-400)]/30 p-6 text-[var(--color-ink-700)]">
            {error}
          </div>
        )}

        {!loading && !error && listings.length === 0 && (
          <div className="rounded-[var(--radius-card)] bg-[var(--color-cream-100)] p-10 text-center">
            <p className="text-[var(--color-ink-500)]">
              No listings yet in this category. Check back soon!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-[var(--radius-card)] shadow-card hover:shadow-hover-card transition-shadow overflow-hidden flex flex-col"
            >
              <div className="p-5 flex flex-col flex-1">
                <div className="text-xs text-[var(--color-ink-500)] mb-1.5">
                  {listing.organization?.name ?? "Local vendor"}
                </div>
                <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)] mb-1">
                  {listing.name}
                </h3>
                <p className="text-[var(--color-ink-500)] text-sm mb-4">
                  {listing.category}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-emerald-700)] text-lg">
                    ৳{listing.price}
                  </span>
                  <button
                    onClick={() => addItem(listing)}
                    className="bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors"
                  >
                    Add to cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust section */}
      <section className="bg-[var(--color-emerald-900)] py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 grid sm:grid-cols-2 gap-10 items-center">
          <div className="relative aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden shadow-elevated">
            <Image
              src="https://images.pexels.com/photos/36330752/pexels-photo-36330752.jpeg?auto=compress&cs=tinysrgb&h=900&w=1200"
              alt="A local Muktagacha shop owner"
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 500px"
            />
          </div>
          <div>
            <p className="text-[var(--color-gold-400)] font-medium text-sm tracking-wide uppercase mb-3">
              Why Muktagacha
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[var(--color-cream-50)] mb-4">
              Every vendor is someone you could meet on the street
            </h2>
            <p className="text-[var(--color-cream-100)]/80 leading-relaxed">
              No faceless warehouses. Every shop on Muktagacha is a real
              neighbor — approved by hand before they ever list a product, so
              you know exactly who you're buying from.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
