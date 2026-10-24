"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import ImageUploadField from "@/components/ImageUploadField";
import type {
  Product,
  Order,
  Organization,
  Vertical,
  Category,
  CloudinaryUploadSignature,
} from "@/lib/types";

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
              onChange={(url) => setOrgForm({ ...orgForm, logoUrl: url })}
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

const PAYMENT_VERIFICATION_STYLE: Record<string, string> = {
  NOT_SUBMITTED: "bg-[var(--color-ink-50,#f1f1ef)] text-[var(--color-ink-500)]",
  PENDING_VERIFICATION: "bg-[var(--color-gold-50)] text-[var(--color-gold-600)]",
  VERIFIED: "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]",
  REJECTED: "bg-red-50 text-red-600",
};

type VariantDraft = {
  size: string;
  color: string;
  stockCount: string;
  priceOverride: string;
};

function VendorOrgPanel({ org, token }: { org: Organization; token: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [paymentNumbers, setPaymentNumbers] = useState({
    bkashNumber: org.bkashNumber ?? "",
    nagadNumber: org.nagadNumber ?? "",
  });
  const [savingPayment, setSavingPayment] = useState(false);

  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([
    { size: "", color: "", stockCount: "", priceOverride: "" },
  ]);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    basePrice: "",
    categoryId: "",
    imageUrl: "" as string | null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<Product[]>(`/products/organization/${org.id}`)
      .then(setProducts);
    api.get<Order[]>(`/orders/organization/${org.id}`, token).then(setOrders);
    api
      .get<Category[]>(`/categories?vertical=${org.vertical}`)
      .then(setCategories);
  }, [org.id, org.vertical, token]);

  async function getUploadSignature(): Promise<CloudinaryUploadSignature> {
    return api.get<CloudinaryUploadSignature>(
      `/organizations/${org.id}/cloudinary/upload-signature`,
      token,
    );
  }

  function addVariantRow() {
    setVariants((prev) => [
      ...prev,
      { size: "", color: "", stockCount: "", priceOverride: "" },
    ]);
  }

  function removeVariantRow(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof VariantDraft, value: string) {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)),
    );
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const builtVariants = hasVariants
        ? variants
            .filter((v) => v.size || v.color)
            .map((v) => ({
              optionValues: {
                ...(v.size ? { size: v.size } : {}),
                ...(v.color ? { color: v.color } : {}),
              },
              stockCount: Number(v.stockCount) || 0,
              priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
            }))
        : [];

      const product = await api.post<Product>(
        "/products",
        {
          organizationId: org.id,
          categoryId: productForm.categoryId || undefined,
          name: productForm.name,
          description: productForm.description || undefined,
          basePrice: Number(productForm.basePrice),
          hasVariants,
          images: productForm.imageUrl
            ? [{ url: productForm.imageUrl }]
            : undefined,
          variants: builtVariants.length ? builtVariants : undefined,
        },
        token,
      );
      setProducts((prev) => [...prev, product]);
      setProductForm({
        name: "",
        description: "",
        basePrice: "",
        categoryId: "",
        imageUrl: "",
      });
      setHasVariants(false);
      setVariants([{ size: "", color: "", stockCount: "", priceOverride: "" }]);
      setShowAddProduct(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeProduct(id: string) {
    await api.delete(`/products/${id}`, token);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function updateOrderStatus(orderId: string, status: string) {
    const updated = await api.patch<Order>(
      `/orders/${orderId}/status`,
      { status },
      token,
    );
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
  }

  async function verifyPayment(orderId: string, verification: "VERIFIED" | "REJECTED") {
    const updated = await api.patch<Order>(
      `/orders/${orderId}/verify-payment`,
      { verification },
      token,
    );
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
  }

  async function savePaymentNumbers(e: React.FormEvent) {
    e.preventDefault();
    setSavingPayment(true);
    try {
      await api.patch(`/organizations/${org.id}/payment-numbers`, paymentNumbers, token);
      setShowPaymentSettings(false);
    } finally {
      setSavingPayment(false);
    }
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
        <button
          onClick={() => setShowPaymentSettings((s) => !s)}
          className="text-sm text-[var(--color-emerald-700)] font-medium hover:underline"
        >
          Payment settings
        </button>
      </div>

      {org.approvalStatus === "PENDING" && (
        <p className="text-sm text-[var(--color-gold-600)] bg-[var(--color-gold-50)] rounded-lg px-3 py-2 mb-5">
          Waiting for admin approval. You can still add products now — they'll
          appear to customers once approved.
        </p>
      )}

      {showPaymentSettings && (
        <form
          onSubmit={savePaymentNumbers}
          className="rounded-[14px] border border-[var(--color-border)] p-4 space-y-3 mb-6 max-w-sm"
        >
          <p className="text-xs text-[var(--color-ink-500)]">
            Buyers pay these numbers directly via the bKash/Nagad app, then
            submit a transaction ID for you to confirm.
          </p>
          <div>
            <label className={labelClass}>bKash number</label>
            <input
              placeholder="01XXXXXXXXX"
              value={paymentNumbers.bkashNumber}
              onChange={(e) =>
                setPaymentNumbers({ ...paymentNumbers, bkashNumber: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nagad number</label>
            <input
              placeholder="01XXXXXXXXX"
              value={paymentNumbers.nagadNumber}
              onChange={(e) =>
                setPaymentNumbers({ ...paymentNumbers, nagadNumber: e.target.value })
              }
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={savingPayment}
            className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
          >
            {savingPayment ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      <h3 className="font-display font-semibold text-[var(--color-ink-900)] mb-3">
        Products
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="rounded-[14px] border border-[var(--color-border)] overflow-hidden bg-[var(--color-cream-50)]"
          >
            <div className="relative aspect-square bg-[var(--color-cream-100)]">
              {p.images?.[0]?.url ? (
                <Image
                  src={p.images[0].url}
                  alt={p.name}
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
                {p.name}
              </p>
              {p.hasVariants && (
                <p className="text-xs text-[var(--color-ink-500)]">
                  {p.variants.length} variant(s)
                </p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-semibold text-[var(--color-emerald-700)]">
                  ৳{p.basePrice}
                </span>
                <button
                  onClick={() => removeProduct(p.id)}
                  className="text-xs text-[var(--color-ink-300)] hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <p className="text-sm text-[var(--color-ink-300)] col-span-full">
            No products yet.
          </p>
        )}
      </div>

      {!showAddProduct ? (
        <button
          onClick={() => setShowAddProduct(true)}
          className="text-sm text-[var(--color-emerald-700)] font-medium border border-[var(--color-emerald-600)] rounded-[var(--radius-pill)] px-4 py-2 hover:bg-[var(--color-emerald-50)] transition-colors"
        >
          + Add product
        </button>
      ) : (
        <form
          onSubmit={addProduct}
          className="rounded-[14px] border border-[var(--color-border)] p-4 space-y-3 max-w-sm"
        >
          <ImageUploadField
            value={productForm.imageUrl}
            onChange={(url) => setProductForm({ ...productForm, imageUrl: url })}
            label="Product photo"
            getUploadSignature={getUploadSignature}
          />
          <input
            required
            placeholder="Product name"
            value={productForm.name}
            onChange={(e) =>
              setProductForm({ ...productForm, name: e.target.value })
            }
            className={inputClass}
          />
          <textarea
            placeholder="Short description (optional)"
            value={productForm.description}
            onChange={(e) =>
              setProductForm({ ...productForm, description: e.target.value })
            }
            rows={2}
            className={inputClass}
          />
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={productForm.categoryId}
              onChange={(e) =>
                setProductForm({ ...productForm, categoryId: e.target.value })
              }
              className={inputClass}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-[var(--color-ink-300)] mt-1">
                No categories set up yet for this shop type — ask the admin
                to add one, or leave blank for now.
              </p>
            )}
          </div>
          <input
            required
            type="number"
            placeholder={hasVariants ? "Starting price (৳)" : "Price (৳)"}
            value={productForm.basePrice}
            onChange={(e) =>
              setProductForm({ ...productForm, basePrice: e.target.value })
            }
            className={inputClass}
          />

          <label className="flex items-center gap-2 text-sm text-[var(--color-ink-700)]">
            <input
              type="checkbox"
              checked={hasVariants}
              onChange={(e) => setHasVariants(e.target.checked)}
            />
            This product comes in different sizes/colors
          </label>

          {hasVariants && (
            <div className="space-y-2 bg-[var(--color-cream-100)] rounded-[12px] p-3">
              <p className="text-xs text-[var(--color-ink-500)]">
                Add each size/color combination you stock, with its own
                quantity. Leave price blank to use the base price above.
              </p>
              {variants.map((v, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input
                    placeholder="Size"
                    value={v.size}
                    onChange={(e) => updateVariant(i, "size", e.target.value)}
                    className="w-16 border border-[var(--color-border)] rounded-[8px] px-2 py-1.5 text-sm"
                  />
                  <input
                    placeholder="Color"
                    value={v.color}
                    onChange={(e) => updateVariant(i, "color", e.target.value)}
                    className="w-20 border border-[var(--color-border)] rounded-[8px] px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={v.stockCount}
                    onChange={(e) => updateVariant(i, "stockCount", e.target.value)}
                    className="w-16 border border-[var(--color-border)] rounded-[8px] px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="৳ (opt.)"
                    value={v.priceOverride}
                    onChange={(e) => updateVariant(i, "priceOverride", e.target.value)}
                    className="w-20 border border-[var(--color-border)] rounded-[8px] px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariantRow(i)}
                    className="text-[var(--color-ink-300)] hover:text-red-600 text-sm px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addVariantRow}
                className="text-xs text-[var(--color-emerald-700)] font-medium"
              >
                + Add another combination
              </button>
            </div>
          )}

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
              onClick={() => setShowAddProduct(false)}
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
            className="rounded-[14px] border border-[var(--color-border)] p-3"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <p className="font-medium text-[var(--color-ink-900)]">
                  {order.buyer?.fullName ?? "Buyer"}
                </p>
                <p className="text-[var(--color-ink-500)] text-xs">
                  {order.items.length} item(s) · {order.paymentMethod}
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

            {order.paymentMethod !== "CASH_ON_DELIVERY" && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                <div className="text-xs">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full font-medium mr-2 ${PAYMENT_VERIFICATION_STYLE[order.paymentVerification]}`}
                  >
                    {order.paymentVerification.replace("_", " ")}
                  </span>
                  {order.paymentTrxId && (
                    <span className="text-[var(--color-ink-500)]">
                      TrxID: {order.paymentTrxId}
                    </span>
                  )}
                </div>
                {order.paymentVerification === "PENDING_VERIFICATION" && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => verifyPayment(order.id, "VERIFIED")}
                      className="text-xs bg-[var(--color-emerald-700)] text-white px-2.5 py-1 rounded-full font-medium hover:bg-[var(--color-emerald-900)]"
                    >
                      Confirm payment
                    </button>
                    <button
                      onClick={() => verifyPayment(order.id, "REJECTED")}
                      className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
