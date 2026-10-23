"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Listing, Order, Organization, Vertical } from "@/lib/types";

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
    return <div className="max-w-3xl mx-auto px-4 py-12">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">My Store</h1>

      {orgs.length === 0 && (
        <form
          onSubmit={createOrg}
          className="bg-white border border-neutral-200 rounded-lg p-4 mb-6 space-y-3"
        >
          <p className="text-sm text-neutral-500 mb-2">
            You don't have a storefront yet. Create one — it will need admin
            approval before it goes live.
          </p>
          <input
            required
            placeholder="Store name"
            value={orgForm.name}
            onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
            className="w-full border border-neutral-300 rounded-md px-3 py-2"
          />
          <select
            value={orgForm.vertical}
            onChange={(e) =>
              setOrgForm({ ...orgForm, vertical: e.target.value as Vertical })
            }
            className="w-full border border-neutral-300 rounded-md px-3 py-2"
          >
            <option value="MARKETPLACE">Marketplace (products)</option>
            <option value="PHARMACY">Pharmacy</option>
            <option value="SERVICES">Services</option>
          </select>
          <input
            placeholder="Ward (e.g. Ward 3)"
            value={orgForm.ward}
            onChange={(e) => setOrgForm({ ...orgForm, ward: e.target.value })}
            className="w-full border border-neutral-300 rounded-md px-3 py-2"
          />
          <button
            type="submit"
            disabled={creatingOrg}
            className="bg-emerald-600 text-white rounded-md px-4 py-2 font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {creatingOrg ? "Creating..." : "Create storefront"}
          </button>
        </form>
      )}

      {orgs.map((org) => (
        <VendorOrgPanel key={org.id} org={org} token={token!} />
      ))}
    </div>
  );
}

function VendorOrgPanel({ org, token }: { org: Organization; token: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAddListing, setShowAddListing] = useState(false);
  const [listingForm, setListingForm] = useState({
    name: "",
    price: "",
    category: "",
  });

  useEffect(() => {
    api.get<Listing[]>(`/listings/organization/${org.id}`).then(setListings);
    api
      .get<Order[]>(`/orders/organization/${org.id}`, token)
      .then(setOrders);
  }, [org.id, token]);

  async function addListing(e: React.FormEvent) {
    e.preventDefault();
    const listing = await api.post<Listing>(
      "/listings",
      {
        organizationId: org.id,
        type: "PRODUCT",
        name: listingForm.name,
        price: Number(listingForm.price),
        category: listingForm.category,
      },
      token,
    );
    setListings((prev) => [...prev, listing]);
    setListingForm({ name: "", price: "", category: "" });
    setShowAddListing(false);
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
    <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">{org.name}</h2>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            org.approvalStatus === "APPROVED"
              ? "bg-green-100 text-green-800"
              : org.approvalStatus === "PENDING"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800"
          }`}
        >
          {org.approvalStatus}
        </span>
      </div>

      {org.approvalStatus === "PENDING" && (
        <p className="text-sm text-neutral-500 mb-4">
          Waiting for admin approval. You can still add products now — they'll
          appear once approved.
        </p>
      )}

      <h3 className="text-sm font-semibold mt-4 mb-2">Products</h3>
      <div className="space-y-1 mb-3">
        {listings.map((l) => (
          <div key={l.id} className="flex justify-between text-sm">
            <span>{l.name}</span>
            <span>৳{l.price}</span>
          </div>
        ))}
        {listings.length === 0 && (
          <p className="text-sm text-neutral-400">No products yet.</p>
        )}
      </div>

      {!showAddListing ? (
        <button
          onClick={() => setShowAddListing(true)}
          className="text-sm text-emerald-700 font-medium"
        >
          + Add product
        </button>
      ) : (
        <form onSubmit={addListing} className="space-y-2 mt-2">
          <input
            required
            placeholder="Product name"
            value={listingForm.name}
            onChange={(e) =>
              setListingForm({ ...listingForm, name: e.target.value })
            }
            className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
          />
          <input
            required
            type="number"
            placeholder="Price (৳)"
            value={listingForm.price}
            onChange={(e) =>
              setListingForm({ ...listingForm, price: e.target.value })
            }
            className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Category"
            value={listingForm.category}
            onChange={(e) =>
              setListingForm({ ...listingForm, category: e.target.value })
            }
            className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="bg-emerald-600 text-white rounded-md px-3 py-1.5 text-sm font-medium"
          >
            Save
          </button>
        </form>
      )}

      <h3 className="text-sm font-semibold mt-6 mb-2">Orders</h3>
      {orders.length === 0 && (
        <p className="text-sm text-neutral-400">No orders yet.</p>
      )}
      {orders.map((order) => (
        <div
          key={order.id}
          className="border border-neutral-100 rounded-md p-2 mb-2 flex items-center justify-between"
        >
          <div className="text-sm">
            <p>{order.buyer?.fullName ?? "Buyer"}</p>
            <p className="text-neutral-400 text-xs">
              {order.items.length} item(s)
            </p>
          </div>
          <select
            value={order.status}
            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
            className="text-sm border border-neutral-300 rounded-md px-2 py-1"
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
  );
}
