"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import ImageUploadField from "@/components/ImageUploadField";
import type { Listing, Order, Organization, Vertical } from "@/lib/types";

const inputClass =
  "w-full border border-[var(--color-border)] rounded-[12px] px-4 py-2.5 text-[var(--color-ink-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]";
const labelClass =
  "block text-sm font-medium text-[var(--color-ink-700)] mb-1.5";

export default function VendorPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({
    name: "",
    vertical: "MARKETPLACE" as Vertical,
    ward: "",
    logoUrl: "" as string | null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!token || (user?.role !== "VENDOR" && user?.role !== "PROVIDER")) {
      router.push("/");
      return;
    }
    api
      .get<Organization[]>("/organizations/mine", token)
      .then(setOrgs)
      .finally(() => setLoading(false));
  }, [token, authLoading, user, router]);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreatingOrg(true);
    try {
      const org = await api.post<Organization>(
        "/organizations",
        { ...orgForm, area: "Muktagacha" },
        token,
      );
      setOrgs((prev) => [...prev, org]);
    } finally {
      setCreatingOrg(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)] flex items-center justify-center">
        <p className="text-[var(--color-ink-500)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)]">
      <div className="max-w-4xl mx-auto px-5 py-10">
        <h1 className="font-display text-3xl font-semibold text-[var(--color-ink-900)] mb-1">
          My Store
        </h1>
        <p className="text-[var(--color-ink-500)] mb-8">
          Manage your storefront, products, and orders.
        </p>

        {orgs.length === 0 && (
          <form
            onSubmit={createOrg}
            className="bg-white rounded-[var(--radius-card)] shadow-card p-6 space-y-4 max-w-md"
          >
            <p className="text-sm text-[var(--color-ink-500)]">
              You don't have a storefront yet. Create one — it will need
              admin approval before it goes live.
            </p>
            <ImageUploadField
              value={orgForm.logoUrl}
              onChange={(dataUrl) =>
                setOrgForm({ ...orgForm, logoUrl: dataUrl })
              }
              label="Shop photo"
            />
            <div>
              <label className={labelClass}>Store name</label>
              <input
                required
                placeholder="e.g. Rahim's Clothing Store"
                value={orgForm.name}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, name: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>What do you sell?</label>
              <select
                value={orgForm.vertical}
                onChange={(e) =>
                  setOrgForm({
                    ...orgForm,
                    vertical: e.target.value as Vertical,
                  })
                }
                className={inputClass}
              >
                <option value="MARKETPLACE">Marketplace (products)</option>
                <option value="PHARMACY">Pharmacy</option>
                <option value="SERVICES">Services</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Ward</label>
              <input
                placeholder="e.g. Ward 3"
                value={orgForm.ward}
                onChange={(e) =>
                  setOrgForm({ ...orgForm, ward: e.target.value })
                }
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={creatingOrg}
              className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-6 py-2.5 font-medium hover:bg-[var(--color-emerald-900)] transition-colors disabled:opacity-50"
            >
              {creatingOrg ? "Creating..." : "Create storefront"}
            </button>
          </form>
        )}

        <div className="space-y-6">
          {orgs.map((org) => (
            <VendorOrgPanel key={org.id} org={org} token={token!} />
          ))}
        </div>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  APPROVED: "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]",
  PENDING: "bg-[var(--color-gold-50)] text-[var(--color-gold-600)]",
  REJECTED: "bg-red-50 text-red-600",
};

function VendorOrgPanel({ org, token }: { org: Organization; token: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAddListing, setShowAddListing] = useState(false);
  const [listingForm, setListingForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    imageUrl: "" as string | null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Listing[]>(`/listings/organization/${org.id}`).then(setListings);
    api
      .get<Order[]>(`/orders/organization/${org.id}`, token)
      .then(setOrders);
  }, [org.id, token]);

  async function addListing(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const listing = await api.post<Listing>(
        "/listings",
        {
          organizationId: org.id,
          type: "PRODUCT",
          name: listingForm.name,
          description: listingForm.description || undefined,
          imageUrl: listingForm.imageUrl || undefined,
          price: Number(listingForm.price),
          category: listingForm.category,
        },
        token,
      );
      setListings((prev) => [...prev, listing]);
      setListingForm({
        name: "",
        description: "",
        price: "",
        category: "",
        imageUrl: "",
      });
      setShowAddListing(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeListing(id: string) {
    await api.delete(`/listings/${id}`, token);
    setListings((prev) => prev.filter((l) => l.id !== id));
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const updated = await api.patch<Order>(
      `/orders/${orderId}/status`,
      { status },
      token,
    );
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
  }

  return (
    <div className="bg-white rounded-[var(--radius-card)] shadow-card p-6">
      <div className="flex items-center gap-3 mb-5">
        {org.logoUrl ? (
          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-[var(--color-border)]">
            <Image src={org.logoUrl} alt={org.name} fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-full bg-[var(--color-emerald-50)] flex items-center justify-center flex-shrink-0">
            <span className="font-display font-semibold text-[var(--color-emerald-700)]">
              {org.name[0]}
            </span>
          </div>
        )}
        <div className="flex-1">
          <h2 className="font-display font-semibold text-lg text-[var(--color-ink-900)]">
            {org.name}
          </h2>
          <span
            className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[org.approvalStatus]}`}
          >
            {org.approvalStatus}
          </span>
        </div>
      </div>

      {org.approvalStatus === "PENDING" && (
        <p className="text-sm text-[var(--color-gold-600)] bg-[var(--color-gold-50)] rounded-lg px-3 py-2 mb-5">
          Waiting for admin approval. You can still add products now — they'll
          appear to customers once approved.
        </p>
      )}

      <h3 className="font-display font-semibold text-[var(--color-ink-900)] mb-3">
        Products
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {listings.map((l) => (
          <div
            key={l.id}
            className="rounded-[14px] border border-[var(--color-border)] overflow-hidden bg-[var(--color-cream-50)]"
          >
            <div className="relative aspect-square bg-[var(--color-cream-100)]">
              {l.imageUrl ? (
                <Image
                  src={l.imageUrl}
                  alt={l.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-300)] text-xs">
                  No photo
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-sm font-medium text-[var(--color-ink-900)] truncate">
                {l.name}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-semibold text-[var(--color-emerald-700)]">
                  ৳{l.price}
                </span>
                <button
                  onClick={() => removeListing(l.id)}
                  className="text-xs text-[var(--color-ink-300)] hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {listings.length === 0 && (
          <p className="text-sm text-[var(--color-ink-300)] col-span-full">
            No products yet.
          </p>
        )}
      </div>

      {!showAddListing ? (
        <button
          onClick={() => setShowAddListing(true)}
          className="text-sm text-[var(--color-emerald-700)] font-medium border border-[var(--color-emerald-600)] rounded-[var(--radius-pill)] px-4 py-2 hover:bg-[var(--color-emerald-50)] transition-colors"
        >
          + Add product
        </button>
      ) : (
        <form
          onSubmit={addListing}
          className="rounded-[14px] border border-[var(--color-border)] p-4 space-y-3 max-w-sm"
        >
          <ImageUploadField
            value={listingForm.imageUrl}
            onChange={(dataUrl) =>
              setListingForm({ ...listingForm, imageUrl: dataUrl })
            }
            label="Product photo"
          />
          <input
            required
            placeholder="Product name"
            value={listingForm.name}
            onChange={(e) =>
              setListingForm({ ...listingForm, name: e.target.value })
            }
            className={inputClass}
          />
          <textarea
            placeholder="Short description (optional)"
            value={listingForm.description}
            onChange={(e) =>
              setListingForm({ ...listingForm, description: e.target.value })
            }
            rows={2}
            className={inputClass}
          />
          <input
            required
            type="number"
            placeholder="Price (৳)"
            value={listingForm.price}
            onChange={(e) =>
              setListingForm({ ...listingForm, price: e.target.value })
            }
            className={inputClass}
          />
          <input
            placeholder="Category (e.g. Clothing)"
            value={listingForm.category}
            onChange={(e) =>
              setListingForm({ ...listingForm, category: e.target.value })
            }
            className={inputClass}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save product"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddListing(false)}
              className="text-sm text-[var(--color-ink-500)] px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <h3 className="font-display font-semibold text-[var(--color-ink-900)] mt-8 mb-3">
        Orders
      </h3>
      {orders.length === 0 && (
        <p className="text-sm text-[var(--color-ink-300)]">No orders yet.</p>
      )}
      <div className="space-y-2">
        {orders.map((order) => (
          <div
            key={order.id}
            className="rounded-[14px] border border-[var(--color-border)] p-3 flex items-center justify-between"
          >
            <div className="text-sm">
              <p className="font-medium text-[var(--color-ink-900)]">
                {order.buyer?.fullName ?? "Buyer"}
              </p>
              <p className="text-[var(--color-ink-500)] text-xs">
                {order.items.length} item(s)
              </p>
            </div>
            <select
              value={order.status}
              onChange={(e) => updateOrderStatus(order.id, e.target.value)}
              className="text-sm border border-[var(--color-border)] rounded-[10px] px-2 py-1.5 bg-white"
            >
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="OUT_FOR_DELIVERY">Out for delivery</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
