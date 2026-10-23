"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Organization } from "@/lib/types";

export default function AdminPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!token || user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    loadPending();
  }, [token, authLoading, user, router]);

  function loadPending() {
    if (!token) return;
    setLoading(true);
    api
      .get<Organization[]>("/organizations/pending", token)
      .then(setPending)
      .finally(() => setLoading(false));
  }

  async function approve(id: string) {
    if (!token) return;
    await api.patch(`/organizations/${id}/approve`, {}, token);
    setPending((prev) => prev.filter((o) => o.id !== id));
  }

  async function reject(id: string) {
    if (!token) return;
    await api.patch(`/organizations/${id}/reject`, {}, token);
    setPending((prev) => prev.filter((o) => o.id !== id));
  }

  if (authLoading || loading) {
    return <div className="max-w-3xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Vendor Approvals</h1>
      {pending.length === 0 && (
        <p className="text-neutral-500">No pending storefronts to review.</p>
      )}
      <div className="space-y-3">
        {pending.map((org) => (
          <div
            key={org.id}
            className="bg-white border border-neutral-200 rounded-lg p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{org.name}</p>
              <p className="text-sm text-neutral-500">
                {org.vertical} · {org.area} {org.ward ? `· ${org.ward}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => approve(org.id)}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-emerald-700"
              >
                Approve
              </button>
              <button
                onClick={() => reject(org.id)}
                className="bg-red-50 text-red-700 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-100"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
