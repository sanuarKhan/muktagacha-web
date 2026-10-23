"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          Muktagacha
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:text-emerald-700">
            Browse
          </Link>

          {!user && (
            <>
              <Link href="/login" className="hover:text-emerald-700">
                Login
              </Link>
              <Link
                href="/register"
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700"
              >
                Sign up
              </Link>
            </>
          )}

          {user && (
            <>
              <Link href="/orders" className="hover:text-emerald-700">
                My Orders
              </Link>
              {(user.role === "VENDOR" || user.role === "PROVIDER") && (
                <Link href="/vendor" className="hover:text-emerald-700">
                  My Store
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link href="/admin" className="hover:text-emerald-700">
                  Admin
                </Link>
              )}
              <span className="text-neutral-500">{user.fullName}</span>
              <button
                onClick={logout}
                className="text-neutral-500 hover:text-red-600"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
