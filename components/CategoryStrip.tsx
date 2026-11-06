"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import type { Category } from "@/lib/types";

/**
 * Horizontally swipeable category strip.
 *
 * Replaces the previous 3-column grid of large 4:3 photo cards, which had two
 * problems the owner called out:
 *   1. Only 3 of the real categories had a hero image mapped; every other one
 *      silently fell back to the Groceries photo, so unrelated categories all
 *      looked identical.
 *   2. The cards were large rectangles that pushed actual products far below
 *      the fold.
 *
 * Design: name-only pills with a generated colour identity per category. The
 * whole strip is capped at 300px tall (requirement) and scrolls horizontally
 * when there are more categories than fit, instead of wrapping into more rows.
 */

/**
 * Deterministic colour per category name.
 *
 * Why hash the name instead of a hardcoded map: the owner adds categories from
 * the admin panel at any time. A fixed map would leave every new category
 * grey/default (exactly the bug we are fixing). Hashing means any future
 * category gets a stable, distinct colour for free — the same name always
 * produces the same colour, so it never flickers between renders.
 *
 * Palette is drawn from the local Bangladeshi/market context rather than
 * generic SaaS colours: earth, spice, leaf, river, clay, gold.
 */
const PALETTE = [
  { from: "#0C5B3E", to: "#157F57", glow: "rgba(21,127,87,0.28)" },   // leaf green
  { from: "#B45309", to: "#F29E21", glow: "rgba(242,158,33,0.28)" },  // turmeric
  { from: "#9D2235", to: "#D4495E", glow: "rgba(212,73,94,0.26)" },   // hibiscus
  { from: "#1E4D6B", to: "#3C87B0", glow: "rgba(60,135,176,0.26)" },  // river blue
  { from: "#6B3FA0", to: "#9B6FD4", glow: "rgba(155,111,212,0.24)" }, // jamun
  { from: "#8A5A2B", to: "#C4894A", glow: "rgba(196,137,74,0.26)" },  // clay
  { from: "#146B63", to: "#2AA198", glow: "rgba(42,161,152,0.26)" },  // teal
  { from: "#A03E00", to: "#E06A1B", glow: "rgba(224,106,27,0.26)" },  // chilli
];

function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return PALETTE[h % PALETTE.length];
}

/** Two-letter monogram, used instead of a photo. */
function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function CategoryStrip({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function updateArrows() {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  useEffect(() => {
    updateArrows();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => ro.disconnect();
  }, [categories.length]);

  function nudge(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  }

  if (categories.length === 0) return null;

  return (
    <section className="mb-10" aria-label="Browse by category">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-[var(--color-ink-900)]">
            Browse by category
          </h2>
          <p className="text-[var(--color-ink-500)] text-sm mt-0.5">
            {categories.length} categor{categories.length === 1 ? "y" : "ies"} from local shops
          </p>
        </div>

        {/* Arrows are a desktop affordance; touch users simply swipe. */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => nudge(-1)}
            disabled={!canLeft}
            aria-label="Scroll categories left"
            className="w-9 h-9 rounded-full border border-[var(--color-border)] bg-white flex items-center justify-center text-[var(--color-ink-700)] disabled:opacity-30 disabled:cursor-default hover:border-[var(--color-emerald-600)] hover:text-[var(--color-emerald-700)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button
            onClick={() => nudge(1)}
            disabled={!canRight}
            aria-label="Scroll categories right"
            className="w-9 h-9 rounded-full border border-[var(--color-border)] bg-white flex items-center justify-center text-[var(--color-ink-700)] disabled:opacity-30 disabled:cursor-default hover:border-[var(--color-emerald-600)] hover:text-[var(--color-emerald-700)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Edge fades hint that there is more content off-screen. */}
        {canLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-r from-[var(--color-cream-50)] to-transparent" />
        )}
        {canRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 bg-gradient-to-l from-[var(--color-cream-50)] to-transparent" />
        )}

        {/*
          max-h-[300px] satisfies the explicit 300px cap. The rows themselves
          are far shorter than that; the cap is a guarantee the strip can never
          grow tall no matter how many categories exist, because overflow goes
          sideways rather than down.
        */}
        <div
          ref={scroller}
          onScroll={updateArrows}
          className="flex gap-3 overflow-x-auto overflow-y-hidden max-h-[300px] pb-2 -mx-1 px-1 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* "All" resets the filter and is always first. */}
          <CategoryPill
            label="All"
            monogram="＊"
            active={selectedId === ""}
            color={{ from: "#4A4238", to: "#7A7064", glow: "rgba(122,112,100,0.22)" }}
            onClick={() => onSelect("")}
          />
          {categories.map((c) => (
            <CategoryPill
              key={c.id}
              label={c.name}
              monogram={initials(c.name)}
              active={selectedId === c.id}
              color={colorFor(c.name)}
              onClick={() => onSelect(selectedId === c.id ? "" : c.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryPill({
  label,
  monogram,
  active,
  color,
  onClick,
}: {
  label: string;
  monogram: string;
  active: boolean;
  color: { from: string; to: string; glow: string };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className="group relative shrink-0 snap-start rounded-[var(--radius-pill)] transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-emerald-600)] focus-visible:ring-offset-2"
      style={{
        // Lift + colour glow on the active chip, so the current filter is
        // obvious without needing a separate "clear filter" hunt.
        transform: active ? "translateY(-2px)" : undefined,
        boxShadow: active
          ? `0 10px 24px -8px ${color.glow}, 0 0 0 2px ${color.from}`
          : "0 1px 2px rgba(31,27,22,0.04), 0 4px 10px rgba(31,27,22,0.06)",
      }}
    >
      <span
        className="flex items-center gap-2.5 pl-2 pr-5 py-2 rounded-[var(--radius-pill)] border transition-colors"
        style={{
          background: active
            ? `linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%)`
            : "#FFFFFF",
          borderColor: active ? "transparent" : "var(--color-border)",
        }}
      >
        {/* Monogram tile carries the colour identity when not selected. */}
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold tracking-wide shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: active
              ? "rgba(255,255,255,0.22)"
              : `linear-gradient(135deg, ${color.from} 0%, ${color.to} 100%)`,
            color: "#FFFFFF",
          }}
        >
          {monogram}
        </span>
        <span
          className="font-medium text-sm whitespace-nowrap"
          style={{ color: active ? "#FFFFFF" : "var(--color-ink-900)" }}
        >
          {label}
        </span>
      </span>
    </button>
  );
}
