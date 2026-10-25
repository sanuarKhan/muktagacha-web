"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Every role's own "home base" link - the single most important link
  // for a logged-in user, and the one that was completely unreachable
  // on mobile before this fix (every nav link was hidden below the sm
  // breakpoint, leaving only "Log out" visible on a phone).
  const roleLink =
    user?.role === "VENDOR" || user?.role === "PROVIDER"
      ? { href: "/vendor", label: "My store" }
      : user?.role === "RIDER"
        ? { href: "/rider", label: "My deliveries" }
        : user?.role === "ADMIN"
          ? { href: "/admin", label: "Admin" }
          : null;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-cream-50)]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-icon.png"
            alt="Muktagacha"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="font-display text-lg font-semibold text-[var(--color-ink-900)]">
            Muktagacha
          </span>
        </Link>

        {/* Desktop nav - unchanged, just role-aware */}
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          <Link
            href="/"
            className="text-[var(--color-ink-700)] hover:text-[var(--color-emerald-700)] transition-colors"
          >
            Browse
          </Link>

          {!user && (
            <>
              <Link
                href="/login"
                className="text-[var(--color-ink-700)] hover:text-[var(--color-emerald-700)] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors shadow-card"
              >
                Sign up
              </Link>
            </>
          )}

          {user && (
            <>
              {user.role !== "RIDER" && (
                <Link
                  href="/orders"
                  className="text-[var(--color-ink-700)] hover:text-[var(--color-emerald-700)] transition-colors"
                >
                  My orders
                </Link>
              )}
              {roleLink && (
                <Link
                  href={roleLink.href}
                  className="text-[var(--color-ink-700)] hover:text-[var(--color-emerald-700)] transition-colors"
                >
                  {roleLink.label}
                </Link>
              )}
              <span className="hidden md:inline text-[var(--color-ink-500)] text-sm">
                {user.fullName}
              </span>
              <button
                onClick={logout}
                className="text-[var(--color-ink-500)] hover:text-[var(--color-emerald-700)] transition-colors"
              >
                Log out
              </button>
            </>
          )}
        </nav>

        {/* Mobile: a real hamburger menu instead of silently hiding every
            role-specific link. This was the actual bug - on a phone, a
            logged-in vendor/rider/admin previously saw ONLY "Log out"
            with zero way to reach their own dashboard. */}
        <div className="sm:hidden flex items-center gap-3">
          {!user && (
            <Link
              href="/register"
              className="bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] px-3 py-1.5 rounded-[var(--radius-pill)] text-xs font-medium"
            >
              Sign up
            </Link>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--color-cream-100)] text-[var(--color-ink-900)]"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-[var(--color-border)] bg-[var(--color-cream-50)] px-5 py-3 flex flex-col gap-1 text-sm">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="py-2.5 text-[var(--color-ink-700)]"
          >
            Browse
          </Link>
          {!user && (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="py-2.5 text-[var(--color-ink-700)]"
            >
              Log in
            </Link>
          )}
          {user && (
            <>
              {user.role !== "RIDER" && (
                <Link
                  href="/orders"
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-[var(--color-ink-700)]"
                >
                  My orders
                </Link>
              )}
              {roleLink && (
                <Link
                  href={roleLink.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-[var(--color-ink-700)] font-medium"
                >
                  {roleLink.label}
                </Link>
              )}
              <div className="py-2.5 text-[var(--color-ink-500)] border-t border-[var(--color-border)] mt-1 pt-3">
                {user.fullName}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="py-2.5 text-left text-[var(--color-ink-500)]"
              >
                Log out
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
