"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { user, logout } = useAuth();

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

        <nav className="flex items-center gap-5 text-sm">
          <Link
            href="/"
            className="hidden sm:inline text-[var(--color-ink-700)] hover:text-[var(--color-emerald-700)] transition-colors"
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
              <Link
                href="/orders"
                className="hidden sm:inline text-[var(--color-ink-700)] hover:text-[var(--color-emerald-700)] transition-colors"
              >
                My orders
              </Link>
              {(user.role === "VENDOR" || user.role === "PROVIDER") && (
                <Link
                  href="/vendor"
                  className="hidden sm:inline text-[var(--color-ink-700)] hover:text-[var(--color-emerald-700)] transition-colors"
                >
                  My store
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="hidden sm:inline text-[var(--color-ink-700)] hover:text-[var(--color-emerald-700)] transition-colors"
                >
                  Admin
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
      </div>
    </header>
  );
}
