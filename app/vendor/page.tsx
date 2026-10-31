"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import ImageUploadField from "@/components/ImageUploadField";

// Leaflet touches window/document, so it must be loaded client-side
// only - dynamic() with ssr:false is the standard Next.js fix.
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] rounded-[14px] bg-[var(--color-cream-100)] flex items-center justify-center text-sm text-[var(--color-ink-300)]">
      Loading map...
    </div>
  ),
});
import type {
  Product,
  Order,
  Organization,
  Vertical,
  Category,
  CloudinaryUploadSignature,
  MarketingContact,
  MarketingCampaign,
  RiderProfile,
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

  if (orgs.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)] flex items-center justify-center px-5 py-10">
        <form
          onSubmit={createOrg}
          className="bg-white rounded-[var(--radius-card)] shadow-card p-6 space-y-4 max-w-md w-full"
        >
          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">
            Open your shop
          </h1>
          <p className="text-sm text-[var(--color-ink-500)]">
            Create your storefront — it will need admin approval before it
            goes live to customers.
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
              onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>What do you sell?</label>
            <select
              value={orgForm.vertical}
              onChange={(e) =>
                setOrgForm({ ...orgForm, vertical: e.target.value as Vertical })
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
              onChange={(e) => setOrgForm({ ...orgForm, ward: e.target.value })}
              className={inputClass}
            />
          </div>
          <button
            type="submit"
            disabled={creatingOrg}
            className="w-full bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-6 py-2.5 font-medium hover:bg-[var(--color-emerald-900)] transition-colors disabled:opacity-50"
          >
            {creatingOrg ? "Creating..." : "Create storefront"}
          </button>
        </form>
      </div>
    );
  }

  // Most vendors have exactly one shop. If someone has more than one, each
  // gets its own full dashboard shell, stacked.
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[var(--color-cream-100)]">
      {orgs.map((org) => (
        <VendorDashboard key={org.id} org={org} token={token!} />
      ))}
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
  id?: string;
  size: string;
  color: string;
  stockCount: string;
  priceOverride: string;
};

type Tab = "home" | "products" | "orders" | "marketing" | "settings";

const NAV_ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "●" },
  { id: "products", label: "Products", icon: "▦" },
  { id: "orders", label: "Orders", icon: "▤" },
  { id: "marketing", label: "Marketing", icon: "◆" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

function VendorDashboard({ org, token }: { org: Organization; token: string }) {
  const [tab, setTab] = useState<Tab>("home");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Product[]>(`/products/organization/${org.id}`),
      api.get<Order[]>(`/orders/organization/${org.id}`, token),
      api.get<Category[]>(`/categories?vertical=${org.vertical}`),
    ])
      .then(([p, o, c]) => {
        setProducts(p);
        setOrders(o);
        setCategories(c);
      })
      .finally(() => setLoadingData(false));
  }, [org.id, org.vertical, token]);

  const pendingOrders = orders.filter((o) => o.status === "PENDING").length;
  const pendingPayments = orders.filter(
    (o) => o.paymentVerification === "PENDING_VERIFICATION",
  ).length;
  const totalRevenue = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce(
      (sum, o) => sum + o.items.reduce((s, it) => s + Number(it.price) * it.quantity, 0),
      0,
    );

  return (
    <div className="max-w-6xl mx-auto px-5 py-8">
      {/* Shop header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
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
          <h1 className="font-display font-semibold text-xl text-[var(--color-ink-900)] flex items-center gap-2">
            {org.name}
            {org.verificationStatus === "VERIFIED" && (
              <span className="text-xs font-medium text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] px-2 py-0.5 rounded-full">
                ✓ Verified
              </span>
            )}
          </h1>
          <span
            className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[org.approvalStatus]}`}
          >
            {org.approvalStatus}
          </span>
        </div>
      </div>

      {org.approvalStatus === "PENDING" && (
        <p className="text-sm text-[var(--color-gold-600)] bg-[var(--color-gold-50)] rounded-lg px-3 py-2 mb-6">
          Waiting for admin approval. You can still set everything up now —
          it'll appear to customers once approved.
        </p>
      )}

      {/* Dashboard shell: sidebar + content */}
      <div className="flex gap-6 flex-col md:flex-row">
        <aside className="md:w-48 flex-shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-[12px] text-sm font-medium whitespace-nowrap transition-colors text-left ${
                  tab === item.id
                    ? "bg-[var(--color-emerald-700)] text-white"
                    : "text-[var(--color-ink-700)] hover:bg-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
                {item.id === "orders" && pendingOrders > 0 && (
                  <span
                    className={`ml-auto text-xs rounded-full px-1.5 ${
                      tab === item.id
                        ? "bg-white/20"
                        : "bg-[var(--color-gold-500)] text-white"
                    }`}
                  >
                    {pendingOrders}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {loadingData ? (
            <p className="text-sm text-[var(--color-ink-500)]">Loading...</p>
          ) : tab === "home" ? (
            <HomeTab
              products={products}
              orders={orders}
              pendingOrders={pendingOrders}
              pendingPayments={pendingPayments}
              totalRevenue={totalRevenue}
              onGoTo={setTab}
            />
          ) : tab === "products" ? (
            <ProductsTab
              org={org}
              token={token}
              products={products}
              setProducts={setProducts}
              categories={categories}
            />
          ) : tab === "orders" ? (
            <OrdersTab org={org} token={token} orders={orders} setOrders={setOrders} />
          ) : tab === "marketing" ? (
            <MarketingTab org={org} token={token} />
          ) : (
            <SettingsTab org={org} token={token} />
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`rounded-[var(--radius-card)] shadow-card p-4 text-left w-full ${
        highlight ? "bg-[var(--color-gold-50)]" : "bg-white"
      } ${onClick ? "hover:shadow-md transition-shadow" : ""}`}
    >
      <p className="text-xs text-[var(--color-ink-500)] mb-1">{label}</p>
      <p className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--color-ink-300)] mt-0.5">{sub}</p>}
    </Comp>
  );
}

function HomeTab({
  products,
  orders,
  pendingOrders,
  pendingPayments,
  totalRevenue,
  onGoTo,
}: {
  products: Product[];
  orders: Order[];
  pendingOrders: number;
  pendingPayments: number;
  totalRevenue: number;
  onGoTo: (tab: Tab) => void;
}) {
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[var(--color-ink-900)] mb-4">
        Overview
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Products" value={products.length} onClick={() => onGoTo("products")} />
        <StatCard
          label="Orders to fulfill"
          value={pendingOrders}
          onClick={() => onGoTo("orders")}
        />
        <StatCard
          label="Payments to verify"
          value={pendingPayments}
          highlight={pendingPayments > 0}
          onClick={() => onGoTo("orders")}
        />
        <StatCard label="Revenue (completed)" value={`৳${totalRevenue}`} />
      </div>

      <h3 className="font-display font-semibold text-[var(--color-ink-900)] mb-3">
        Recent orders
      </h3>
      {recentOrders.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-500)] bg-white rounded-[var(--radius-card)] shadow-card p-4">
          No orders yet — once a customer buys from you, it'll show up here.
        </p>
      ) : (
        <div className="bg-white rounded-[var(--radius-card)] shadow-card divide-y divide-[var(--color-border)]">
          {recentOrders.map((order) => (
            <div key={order.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-[var(--color-ink-900)]">
                  {order.buyer?.fullName ?? "Buyer"}
                </p>
                <p className="text-xs text-[var(--color-ink-500)]">
                  {order.items?.length ?? 0} item(s) · {order.paymentMethod}
                </p>
              </div>
              <span className="text-xs text-[var(--color-ink-500)]">{order.status}</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="font-display font-semibold text-[var(--color-ink-900)] mt-8 mb-3">
        Marketing
      </h3>
      <button
        onClick={() => onGoTo("marketing")}
        className="w-full bg-white rounded-[var(--radius-card)] shadow-card p-4 flex items-center justify-between hover:shadow-md transition-shadow text-left"
      >
        <div>
          <p className="text-sm font-medium text-[var(--color-ink-900)]">
            SMS campaigns
          </p>
          <p className="text-xs text-[var(--color-ink-500)]">
            Upload your customers' numbers and send them a promotional SMS.
          </p>
        </div>
        <span className="text-xs text-[var(--color-emerald-700)] font-medium">
          Open →
        </span>
      </button>
    </div>
  );
}

function ProductsTab({
  org,
  token,
  products,
  setProducts,
  categories,
}: {
  org: Organization;
  token: string;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");

  function openAdd() {
    setEditingProduct(null);
    setShowForm(true);
  }
  function openEdit(p: Product) {
    setEditingProduct(p);
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditingProduct(null);
  }

  async function removeProduct(id: string) {
    await api.delete(`/products/${id}`, token);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  function handleSaved(product: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      return exists ? prev.map((p) => (p.id === product.id ? product : p)) : [...prev, product];
    });
    closeForm();
  }

  const filtered = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-display text-lg font-semibold text-[var(--color-ink-900)]">
          Products ({products.length})
        </h2>
        {!showForm && (
          <button
            onClick={openAdd}
            className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors"
          >
            + Add product
          </button>
        )}
      </div>

      {showForm && (
        <ProductForm
          org={org}
          token={token}
          categories={categories}
          product={editingProduct}
          onSaved={handleSaved}
          onCancel={closeForm}
        />
      )}

      {products.length > 0 && (
        <input
          placeholder="Search your products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${inputClass} max-w-sm mb-4`}
        />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="rounded-[16px] border border-[var(--color-border)] overflow-hidden bg-white shadow-card hover:shadow-hover-card transition-shadow"
          >
            <div className="relative aspect-square bg-[var(--color-cream-100)]">
              {p.images?.[0]?.url ? (
                <Image src={p.images[0].url} alt={p.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[var(--color-ink-300)] text-xs">
                  No photo
                </div>
              )}
              {(p.images?.length ?? 0) > 1 && (
                <span className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  +{(p.images?.length ?? 1) - 1} more
                </span>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-sm font-medium text-[var(--color-ink-900)] truncate">{p.name}</p>
              {p.hasVariants && (
                <p className="text-xs text-[var(--color-ink-500)]">
                  {p.variants.filter((v) => v.isActive).length} variant(s)
                </p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm font-semibold text-[var(--color-emerald-700)]">
                  ৳{p.basePrice}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(p)}
                    className="text-xs text-[var(--color-emerald-700)] hover:underline font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeProduct(p.id)}
                    className="text-xs text-[var(--color-ink-300)] hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--color-ink-300)] col-span-full">
            {products.length === 0 ? "No products yet." : "No products match that search."}
          </p>
        )}
      </div>
    </div>
  );
}

// Shared Add/Edit form. When `product` is null, this creates a new
// product (POST); when it's set, this edits in place (PATCH) and
// pre-fills every field including existing photos and variants, so a
// vendor actually sees what they're changing instead of starting blank.
function ProductForm({
  org,
  token,
  categories,
  product,
  onSaved,
  onCancel,
}: {
  org: Organization;
  token: string;
  categories: Category[];
  product: Product | null;
  onSaved: (p: Product) => void;
  onCancel: () => void;
}) {
  const isEdit = !!product;
  const [hasVariants, setHasVariants] = useState(product?.hasVariants ?? false);
  const [images, setImages] = useState<string[]>(
    product?.images?.map((img) => img.url) ?? [],
  );
  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants
      ?.filter((v) => v.isActive)
      .map((v) => ({
        id: v.id,
        size: v.optionValues?.size ?? "",
        color: v.optionValues?.color ?? "",
        stockCount: String(v.stockCount ?? ""),
        priceOverride: v.priceOverride ? String(v.priceOverride) : "",
      })) ?? [{ size: "", color: "", stockCount: "", priceOverride: "" }],
  );
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    basePrice: product?.basePrice ? String(product.basePrice) : "",
    categoryId: product?.categoryId ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function getUploadSignature(): Promise<CloudinaryUploadSignature> {
    return api.get<CloudinaryUploadSignature>(
      `/organizations/${org.id}/cloudinary/upload-signature`,
      token,
    );
  }

  function addImageSlot() {
    setImages((prev) => [...prev, ""]);
  }
  function setImageAt(index: number, url: string | null) {
    setImages((prev) => prev.map((u, i) => (i === index ? url ?? "" : u)));
  }
  function removeImageAt(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function addVariantRow() {
    setVariants((prev) => [...prev, { size: "", color: "", stockCount: "", priceOverride: "" }]);
  }
  function removeVariantRow(index: number) {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  }
  function updateVariant(index: number, field: keyof VariantDraft, value: string) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const builtVariants = hasVariants
        ? variants
            .filter((v) => v.size || v.color)
            .map((v) => ({
              id: v.id,
              optionValues: {
                ...(v.size ? { size: v.size } : {}),
                ...(v.color ? { color: v.color } : {}),
              },
              stockCount: Number(v.stockCount) || 0,
              priceOverride: v.priceOverride ? Number(v.priceOverride) : undefined,
            }))
        : [];
      const cleanImages = images.filter((u) => u).map((url) => ({ url }));

      const payload = {
        organizationId: org.id,
        categoryId: form.categoryId || undefined,
        name: form.name,
        description: form.description || undefined,
        basePrice: Number(form.basePrice),
        hasVariants,
        images: cleanImages,
        variants: builtVariants,
      };

      const saved = isEdit
        ? await api.patch<Product>(`/products/${product!.id}`, payload, token)
        : await api.post<Product>("/products", payload, token);
      onSaved(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="bg-white rounded-[var(--radius-card)] shadow-elevated p-6 sm:p-8 max-w-lg mb-6 border border-[var(--color-border)]"
    >
      <div className="mb-6 pb-5 border-b border-[var(--color-border)]">
        <h3 className="font-display text-xl font-semibold text-[var(--color-ink-900)]">
          {isEdit ? "Edit product" : "Add a new product"}
        </h3>
        <p className="text-sm text-[var(--color-ink-500)] mt-1">
          {isEdit
            ? "Update the details below — changes go live as soon as you save."
            : "Fill in the details below. You can always come back and edit this later."}
        </p>
      </div>

      <div className="mb-6">
        <label className={labelClass}>Photos</label>
        <p className="text-xs text-[var(--color-ink-500)] mb-2.5">
          The first photo is what customers see first. Add a few angles if you can —
          listings with more than one photo build more trust.
        </p>
        <div className="flex flex-wrap gap-3">
          {images.map((url, i) => (
            <div key={i} className="relative">
              {i === 0 && url && (
                <span className="absolute -top-2 left-1.5 z-10 bg-[var(--color-emerald-700)] text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                  Main
                </span>
              )}
              <ImageUploadField
                value={url || null}
                onChange={(u) => setImageAt(i, u)}
                label=""
                size="sm"
                getUploadSignature={getUploadSignature}
                onRemove={() => removeImageAt(i)}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addImageSlot}
            className="w-20 h-20 rounded-[14px] border-2 border-dashed border-[var(--color-border)] flex flex-col items-center justify-center gap-0.5 text-[var(--color-ink-300)] hover:border-[var(--color-emerald-600)] hover:text-[var(--color-emerald-600)] hover:bg-[var(--color-emerald-50)] transition-colors"
          >
            <span className="text-xl leading-none">+</span>
            <span className="text-[10px] font-medium">Add photo</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelClass}>Product name</label>
          <input
            required
            placeholder="e.g. Men's Cotton Panjabi"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Description (optional)</label>
          <textarea
            placeholder="A short, honest description of the product..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              className={inputClass}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{hasVariants ? "Starting price" : "Price"}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-ink-500)] text-sm">
                ৳
              </span>
              <input
                required
                type="number"
                placeholder="0"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                className={`${inputClass} pl-8`}
              />
            </div>
          </div>
        </div>
        {categories.length === 0 && (
          <p className="text-xs text-[var(--color-ink-300)] -mt-2">
            No categories set up yet for this shop type — ask the admin
            to add one, or leave blank for now.
          </p>
        )}

        <label className="flex items-center gap-2.5 text-sm text-[var(--color-ink-700)] bg-[var(--color-cream-100)] rounded-[12px] px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => setHasVariants(e.target.checked)}
            className="w-4 h-4 accent-[var(--color-emerald-700)]"
          />
          This product comes in different sizes or colors
        </label>

        {hasVariants && (
          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-cream-100)]/60 p-4 space-y-3">
            <p className="text-xs text-[var(--color-ink-500)]">
              Add each size/color combination you stock, with its own quantity.
              Leave price blank to use the price above.
            </p>
            {variants.map((v, i) => (
              <div
                key={i}
                className="bg-white rounded-[12px] border border-[var(--color-border)] p-3 flex flex-wrap items-center gap-2"
              >
                <input
                  placeholder="Size"
                  value={v.size}
                  onChange={(e) => updateVariant(i, "size", e.target.value)}
                  className="w-20 border border-[var(--color-border)] rounded-[8px] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                />
                <input
                  placeholder="Color"
                  value={v.color}
                  onChange={(e) => updateVariant(i, "color", e.target.value)}
                  className="w-24 border border-[var(--color-border)] rounded-[8px] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={v.stockCount}
                  onChange={(e) => updateVariant(i, "stockCount", e.target.value)}
                  className="w-20 border border-[var(--color-border)] rounded-[8px] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                />
                <input
                  type="number"
                  placeholder="৳ (opt.)"
                  value={v.priceOverride}
                  onChange={(e) => updateVariant(i, "priceOverride", e.target.value)}
                  className="w-24 border border-[var(--color-border)] rounded-[8px] px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-emerald-600)]"
                />
                <button
                  type="button"
                  onClick={() => removeVariantRow(i)}
                  className="ml-auto text-[var(--color-ink-300)] hover:text-red-600 text-sm w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addVariantRow}
              className="text-xs text-[var(--color-emerald-700)] font-semibold hover:text-[var(--color-emerald-900)]"
            >
              + Add another combination
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-7 pt-5 border-t border-[var(--color-border)]">
        <button
          type="submit"
          disabled={saving}
          className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-6 py-2.5 text-sm font-semibold hover:bg-[var(--color-emerald-900)] disabled:opacity-50 shadow-sm"
        >
          {saving ? "Saving..." : isEdit ? "Save changes" : "Save product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-[var(--color-ink-500)] px-4 hover:text-[var(--color-ink-900)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function OrdersTab({
  org,
  token,
  orders,
  setOrders,
}: {
  org: Organization;
  token: string;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
}) {
  const [filter, setFilter] = useState<string>("ALL");
  const [riders, setRiders] = useState<RiderProfile[]>([]);

  useEffect(() => {
    api.get<RiderProfile[]>("/riders/approved", token).then(setRiders);
  }, [token]);

  async function updateOrderStatus(orderId: string, status: string) {
    const updated = await api.patch<Order>(`/orders/${orderId}/status`, { status }, token);
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

  async function assignRider(orderId: string, riderId: string) {
    if (!riderId) return;
    const updated = await api.post<Order>(
      `/riders/orders/${orderId}/assign`,
      { riderId },
      token,
    );
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
  }

  const FILTERS = ["ALL", "PENDING", "CONFIRMED", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"];
  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[var(--color-ink-900)] mb-4">
        Orders ({orders.length})
      </h2>

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-[var(--color-emerald-700)] text-white"
                : "bg-white text-[var(--color-ink-500)] hover:bg-[var(--color-emerald-50)]"
            }`}
          >
            {f.replace(/_/g, " ")}
            {f !== "ALL" && (
              <span className="ml-1 opacity-70">
                ({orders.filter((o) => o.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-[var(--color-ink-300)] bg-white rounded-[var(--radius-card)] shadow-card p-4">
          No orders in this view.
        </p>
      )}
      <div className="space-y-2">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="rounded-[14px] border border-[var(--color-border)] bg-white p-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm">
                <p className="font-medium text-[var(--color-ink-900)]">
                  {order.buyer?.fullName ?? "Buyer"}
                </p>
                <p className="text-[var(--color-ink-500)] text-xs">
                  {order.items?.length ?? 0} item(s) · {order.paymentMethod}
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
              <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between flex-wrap gap-2">
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

            {(order.status === "CONFIRMED" || order.status === "OUT_FOR_DELIVERY") && (
              <div className="mt-2 pt-2 border-t border-[var(--color-border)]">
                {order.riderId ? (
                  <p className="text-xs text-[var(--color-emerald-700)] font-medium">
                    ✓ Rider assigned
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue=""
                      onChange={(e) => assignRider(order.id, e.target.value)}
                      className="text-xs border border-[var(--color-border)] rounded-[10px] px-2 py-1.5 bg-white flex-1"
                    >
                      <option value="" disabled>
                        {riders.length === 0 ? "No approved riders yet" : "Assign a rider..."}
                      </option>
                      {riders.map((r) => (
                        <option key={r.userId} value={r.userId}>
                          {r.user?.fullName} ({r.vehicleType})
                          {r.avgRating ? ` · ★${Number(r.avgRating).toFixed(1)}` : ""}
                        </option>
                      ))}
                    </select>
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

type SettingsSection = "profile" | "payment" | "images" | "skodepay" | "location" | "verification";

function MarketingTab({ org, token }: { org: Organization; token: string }) {
  const [contacts, setContacts] = useState<MarketingContact[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkText, setBulkText] = useState("");
  const [addingContacts, setAddingContacts] = useState(false);
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<MarketingCampaign | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<MarketingContact[]>(`/organizations/${org.id}/marketing/contacts`, token),
      api.get<MarketingCampaign[]>(`/organizations/${org.id}/marketing/campaigns`, token),
    ])
      .then(([c, camp]) => {
        setContacts(c);
        setCampaigns(camp);
      })
      .finally(() => setLoading(false));
  }, [org.id, token]);

  // Parses lines like "01712345678" or "01712345678, Rahim" - one contact
  // per line, name optional after a comma. Simple and forgiving since
  // vendors will paste this from their phone's contact export or WhatsApp.
  async function addBulkContacts(e: React.FormEvent) {
    e.preventDefault();
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed = lines.map((line) => {
      const [phone, ...rest] = line.split(",");
      return { phone: phone.trim(), name: rest.join(",").trim() || undefined };
    });
    if (parsed.length === 0) return;
    await submitContacts(parsed);
    setBulkText("");
  }

  async function submitContacts(
    parsed: { phone: string; name?: string }[],
  ) {
    if (parsed.length === 0) return;
    setAddingContacts(true);
    try {
      const result = await api.post<{ added: number; skipped: number }>(
        `/organizations/${org.id}/marketing/contacts`,
        { contacts: parsed },
        token,
      );
      const refreshed = await api.get<MarketingContact[]>(
        `/organizations/${org.id}/marketing/contacts`,
        token,
      );
      setContacts(refreshed);
      setCsvMessage(
        `Added/updated ${result.added} contact(s)${
          result.skipped > 0 ? `, skipped ${result.skipped} invalid row(s)` : ""
        }.`,
      );
    } finally {
      setAddingContacts(false);
    }
  }

  // Accepts a plain .csv (phone,name per row - header row optional and
  // auto-skipped if the first cell isn't a phone-looking string) or a
  // .txt export. Handles the common "phone,name" and "name,phone" column
  // orders by picking whichever cell looks like a phone number.
  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = String(reader.result ?? "");
      const rows = text
        .split(/\r?\n/)
        .map((r) => r.trim())
        .filter(Boolean);

      const looksLikePhone = (s: string) => /\d{6,}/.test(s.replace(/\D/g, ""));

      const parsed: { phone: string; name?: string }[] = [];
      for (const row of rows) {
        const cells = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const phoneCell = cells.find((c) => looksLikePhone(c));
        if (!phoneCell) continue; // header row or junk line - skip silently
        const nameCell = cells.find((c) => c && c !== phoneCell);
        parsed.push({ phone: phoneCell, name: nameCell || undefined });
      }

      if (parsed.length === 0) {
        setCsvMessage("Couldn't find any phone numbers in that file.");
        return;
      }
      await submitContacts(parsed);
    };
    reader.readAsText(file);
    e.target.value = ""; // allow re-uploading the same file name
  }

  async function removeContact(id: string) {
    await api.delete(`/organizations/${org.id}/marketing/contacts/${id}`, token);
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  async function sendCampaign(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || contacts.length === 0) return;
    setSending(true);
    setSendResult(null);
    try {
      const campaign = await api.post<MarketingCampaign>(
        `/organizations/${org.id}/marketing/campaigns`,
        { message },
        token,
      );
      setCampaigns((prev) => [campaign, ...prev]);
      setSendResult(campaign);
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--color-ink-500)]">Loading...</p>;
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[var(--color-ink-900)] mb-1">
        Marketing
      </h2>
      <p className="text-sm text-[var(--color-ink-500)] mb-6">
        Upload your customers' phone numbers and send them a promotional SMS
        whenever you want — new stock, a sale, anything.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contacts */}
        <div>
          <h3 className="font-display font-semibold text-[var(--color-ink-900)] mb-3">
            Customers ({contacts.length})
          </h3>
          <form
            onSubmit={addBulkContacts}
            className="bg-white rounded-[var(--radius-card)] shadow-card p-4 space-y-2 mb-4"
          >
            <label className={labelClass}>Add numbers (one per line)</label>
            <textarea
              placeholder={"01712345678, Rahim\n01898765432\n..."}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={4}
              className={inputClass}
            />
            <p className="text-xs text-[var(--color-ink-300)]">
              Name is optional — just add a comma after the number if you have one.
            </p>
            <button
              type="submit"
              disabled={addingContacts || !bulkText.trim()}
              className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
            >
              {addingContacts ? "Adding..." : "Add to list"}
            </button>
          </form>

          <div className="bg-white rounded-[var(--radius-card)] shadow-card p-4 mb-4">
            <label className={labelClass}>Or upload a CSV / contact export</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCsvFile}
              disabled={addingContacts}
              className="text-sm text-[var(--color-ink-700)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-emerald-50)] file:text-[var(--color-emerald-700)] file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
            <p className="text-xs text-[var(--color-ink-300)] mt-1.5">
              Any .csv with a phone number column (name column optional) —
              exported from your phone, Excel, or Google Contacts.
            </p>
            {csvMessage && (
              <p className="text-xs text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2 mt-2">
                {csvMessage}
              </p>
            )}
          </div>

          <div className="bg-white rounded-[var(--radius-card)] shadow-card divide-y divide-[var(--color-border)] max-h-72 overflow-y-auto">
            {contacts.length === 0 && (
              <p className="text-sm text-[var(--color-ink-500)] p-4">
                No customers added yet.
              </p>
            )}
            {contacts.map((c) => (
              <div key={c.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-[var(--color-ink-900)]">{c.phone}</p>
                  {c.name && <p className="text-xs text-[var(--color-ink-500)]">{c.name}</p>}
                </div>
                <button
                  onClick={() => removeContact(c.id)}
                  className="text-xs text-[var(--color-ink-300)] hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Send a campaign */}
        <div>
          <h3 className="font-display font-semibold text-[var(--color-ink-900)] mb-3">
            Send a message
          </h3>
          <form
            onSubmit={sendCampaign}
            className="bg-white rounded-[var(--radius-card)] shadow-card p-4 space-y-3"
          >
            <textarea
              required
              placeholder="e.g. Eid special! 20% off all items this week at our shop."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className={inputClass}
            />
            <p className="text-xs text-[var(--color-ink-500)]">
              This will be sent to all {contacts.length} customer
              {contacts.length === 1 ? "" : "s"} on your list.
            </p>
            {contacts.length === 0 && (
              <p className="text-xs text-[var(--color-gold-600)] bg-[var(--color-gold-50)] rounded-lg px-3 py-2">
                Add some customer numbers on the left before sending.
              </p>
            )}
            <button
              type="submit"
              disabled={sending || contacts.length === 0}
              className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
            >
              {sending ? "Sending..." : `Send to ${contacts.length} customer(s)`}
            </button>
            {sendResult && (
              <p
                className={`text-xs rounded-lg px-3 py-2 ${
                  sendResult.sentCount > 0
                    ? "bg-[var(--color-emerald-50)] text-[var(--color-emerald-700)]"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {sendResult.sentCount > 0
                  ? `Sent to ${sendResult.sentCount} of ${sendResult.recipientCount} customers.`
                  : "Couldn't send — SMS isn't set up on this account yet. Contact support."}
              </p>
            )}
          </form>

          <h3 className="font-display font-semibold text-[var(--color-ink-900)] mt-6 mb-3">
            Past campaigns
          </h3>
          <div className="bg-white rounded-[var(--radius-card)] shadow-card divide-y divide-[var(--color-border)]">
            {campaigns.length === 0 && (
              <p className="text-sm text-[var(--color-ink-500)] p-4">
                No campaigns sent yet.
              </p>
            )}
            {campaigns.map((c) => (
              <div key={c.id} className="p-3 text-sm">
                <p className="text-[var(--color-ink-900)] line-clamp-2">{c.message}</p>
                <p className="text-xs text-[var(--color-ink-500)] mt-1">
                  {new Date(c.createdAt).toLocaleDateString()} · Sent {c.sentCount}/
                  {c.recipientCount}
                  {c.failedCount > 0 && ` · ${c.failedCount} failed`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ org, token }: { org: Organization; token: string }) {
  const [section, setSection] = useState<SettingsSection>("profile");

  const [paymentNumbers, setPaymentNumbers] = useState({
    bkashNumber: org.bkashNumber ?? "",
    nagadNumber: org.nagadNumber ?? "",
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);

  const [cloudinaryForm, setCloudinaryForm] = useState({
    cloudName: "",
    apiKey: "",
    apiSecret: "",
  });
  const [savingCloudinary, setSavingCloudinary] = useState(false);
  const [cloudinaryConnected, setCloudinaryConnected] = useState(
    !!org.cloudinaryCloudName,
  );
  const [cloudinaryError, setCloudinaryError] = useState<string | null>(null);

  const [skodePayKey, setSkodePayKey] = useState("");
  const [skodePayConnected, setSkodePayConnected] = useState(
    !!org.skodePayEnabled,
  );
  const [savingSkodePay, setSavingSkodePay] = useState(false);
  const [skodePayError, setSkodePayError] = useState<string | null>(null);

  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(
    org.latitude && org.longitude
      ? { lat: Number(org.latitude), lng: Number(org.longitude) }
      : null,
  );
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  const [tradeLicenseUrl, setTradeLicenseUrl] = useState<string | null>(org.tradeLicenseUrl ?? null);
  const [nidUrl, setNidUrl] = useState<string | null>(org.nidUrl ?? null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [verificationSubmitted, setVerificationSubmitted] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState(org.verificationStatus ?? "UNVERIFIED");

  async function savePaymentNumbers(e: React.FormEvent) {
    e.preventDefault();
    setSavingPayment(true);
    setPaymentSaved(false);
    try {
      await api.patch(`/organizations/${org.id}/payment-numbers`, paymentNumbers, token);
      setPaymentSaved(true);
    } finally {
      setSavingPayment(false);
    }
  }

  async function saveCloudinaryCredentials(e: React.FormEvent) {
    e.preventDefault();
    setSavingCloudinary(true);
    setCloudinaryError(null);
    try {
      await api.post(`/organizations/${org.id}/cloudinary`, cloudinaryForm, token);
      setCloudinaryConnected(true);
      setCloudinaryForm({ cloudName: "", apiKey: "", apiSecret: "" });
    } catch (err: any) {
      setCloudinaryError(
        err?.message ?? "Could not save those credentials. Double-check them and try again.",
      );
    } finally {
      setSavingCloudinary(false);
    }
  }

  async function disconnectCloudinary() {
    await api.delete(`/organizations/${org.id}/cloudinary`, token);
    setCloudinaryConnected(false);
  }

  async function saveSkodePay(e: React.FormEvent) {
    e.preventDefault();
    setSavingSkodePay(true);
    setSkodePayError(null);
    try {
      await api.patch(
        `/organizations/${org.id}/skodepay-settings`,
        { apiKey: skodePayKey, enabled: true },
        token,
      );
      setSkodePayConnected(true);
      setSkodePayKey("");
    } catch (err: any) {
      setSkodePayError(
        err?.message ?? "Could not save that API key. Double-check it and try again.",
      );
    } finally {
      setSavingSkodePay(false);
    }
  }

  async function disconnectSkodePay() {
    await api.patch(`/organizations/${org.id}/skodepay-settings`, { enabled: false }, token);
    setSkodePayConnected(false);
  }

  async function saveLocation() {
    if (!pin) return;
    setSavingLocation(true);
    setLocationSaved(false);
    try {
      await api.patch(
        `/organizations/${org.id}/location`,
        { latitude: pin.lat, longitude: pin.lng },
        token,
      );
      setLocationSaved(true);
    } finally {
      setSavingLocation(false);
    }
  }

  async function submitVerification() {
    if (!tradeLicenseUrl && !nidUrl) {
      setVerificationError("Upload at least a trade license or an NID photo.");
      return;
    }
    setSubmittingVerification(true);
    setVerificationError(null);
    setVerificationSubmitted(false);
    try {
      await api.patch(
        `/organizations/${org.id}/verification`,
        { tradeLicenseUrl, nidUrl },
        token,
      );
      setVerificationStatus("PENDING_REVIEW");
      setVerificationSubmitted(true);
    } catch (err: any) {
      setVerificationError(err?.message ?? "Could not submit for verification. Try again.");
    } finally {
      setSubmittingVerification(false);
    }
  }

  const SECTIONS: { id: SettingsSection; label: string }[] = [
    { id: "profile", label: "Shop profile" },
    { id: "payment", label: "Payment numbers" },
    { id: "images", label: "Image uploads" },
    { id: "skodepay", label: "SkodePay" },
    { id: "location", label: "Location" },
    { id: "verification", label: "Verification" },
  ];

  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-[var(--color-ink-900)] mb-4">
        Settings
      </h2>

      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`text-sm px-3.5 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
              section === s.id
                ? "bg-[var(--color-emerald-700)] text-white"
                : "bg-white text-[var(--color-ink-500)] hover:bg-[var(--color-emerald-50)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "profile" && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-5 max-w-sm space-y-2">
          <p className="text-sm text-[var(--color-ink-700)]">
            <span className="text-[var(--color-ink-500)]">Shop name:</span> {org.name}
          </p>
          <p className="text-sm text-[var(--color-ink-700)]">
            <span className="text-[var(--color-ink-500)]">Type:</span> {org.vertical}
          </p>
          <p className="text-sm text-[var(--color-ink-700)]">
            <span className="text-[var(--color-ink-500)]">Area:</span> {org.area}
            {org.ward ? ` · ${org.ward}` : ""}
          </p>
          <p className="text-sm text-[var(--color-ink-700)]">
            <span className="text-[var(--color-ink-500)]">Status:</span>{" "}
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[org.approvalStatus]}`}>
              {org.approvalStatus}
            </span>
          </p>
          <p className="text-xs text-[var(--color-ink-300)] pt-2">
            To change your shop name, photo, or area, contact admin support.
          </p>
        </div>
      )}

      {section === "payment" && (
        <form
          onSubmit={savePaymentNumbers}
          className="bg-white rounded-[var(--radius-card)] shadow-card p-5 space-y-3 max-w-sm"
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
              onChange={(e) => setPaymentNumbers({ ...paymentNumbers, bkashNumber: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Nagad number</label>
            <input
              placeholder="01XXXXXXXXX"
              value={paymentNumbers.nagadNumber}
              onChange={(e) => setPaymentNumbers({ ...paymentNumbers, nagadNumber: e.target.value })}
              className={inputClass}
            />
          </div>
          {paymentSaved && (
            <p className="text-xs text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2">
              Saved.
            </p>
          )}
          <button
            type="submit"
            disabled={savingPayment}
            className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
          >
            {savingPayment ? "Saving..." : "Save"}
          </button>
        </form>
      )}

      {section === "images" && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-5 space-y-3 max-w-sm">
          <p className="text-xs text-[var(--color-ink-500)]">
            Connect your own free Cloudinary account so your product photos
            use your own storage, not a shared platform account. Get these
            three values from{" "}
            <a
              href="https://console.cloudinary.com/settings/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              console.cloudinary.com
            </a>{" "}
            after creating a free account.
          </p>

          {cloudinaryConnected ? (
            <div className="flex items-center justify-between bg-[var(--color-emerald-50)] rounded-lg px-3 py-2.5">
              <span className="text-sm text-[var(--color-emerald-700)] font-medium">
                ✓ Connected
              </span>
              <button
                onClick={disconnectCloudinary}
                className="text-xs text-[var(--color-ink-500)] hover:text-red-600 flex-shrink-0 ml-2"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <form onSubmit={saveCloudinaryCredentials} className="space-y-3">
              <div>
                <label className={labelClass}>Cloud name</label>
                <input
                  required
                  placeholder="e.g. my-shop-cloud"
                  value={cloudinaryForm.cloudName}
                  onChange={(e) => setCloudinaryForm({ ...cloudinaryForm, cloudName: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>API key</label>
                <input
                  required
                  placeholder="e.g. 123456789012345"
                  value={cloudinaryForm.apiKey}
                  onChange={(e) => setCloudinaryForm({ ...cloudinaryForm, apiKey: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>API secret</label>
                <input
                  required
                  type="password"
                  placeholder="Kept encrypted, never shown again"
                  value={cloudinaryForm.apiSecret}
                  onChange={(e) => setCloudinaryForm({ ...cloudinaryForm, apiSecret: e.target.value })}
                  className={inputClass}
                />
              </div>
              {cloudinaryError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{cloudinaryError}</p>
              )}
              <p className="text-xs text-[var(--color-ink-300)]">
                If you skip this, your photos still upload fine using
                Muktagacha's shared account.
              </p>
              <button
                type="submit"
                disabled={savingCloudinary}
                className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
              >
                {savingCloudinary ? "Connecting..." : "Connect Cloudinary"}
              </button>
            </form>
          )}
        </div>
      )}

      {section === "skodepay" && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-5 space-y-3 max-w-sm">
          <p className="text-xs text-[var(--color-ink-500)]">
            Connect your own SkodePay account for a real hosted checkout page
            with automatic payment verification — no more waiting for buyers
            to manually submit a transaction ID. Get your API key from{" "}
            <a
              href="https://skodepay.skodedigital.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              your SkodePay dashboard
            </a>{" "}
            under Settings → API Keys.
          </p>
          <p className="text-xs text-[var(--color-ink-300)]">
            Money still goes straight to your own SkodePay account —
            Muktagacha never holds or touches your funds.
          </p>

          {skodePayConnected ? (
            <div className="flex items-center justify-between bg-[var(--color-emerald-50)] rounded-lg px-3 py-2.5">
              <span className="text-sm text-[var(--color-emerald-700)] font-medium">
                ✓ Connected
              </span>
              <button
                onClick={disconnectSkodePay}
                className="text-xs text-[var(--color-ink-500)] hover:text-red-600 flex-shrink-0 ml-2"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <form onSubmit={saveSkodePay} className="space-y-3">
              <div>
                <label className={labelClass}>SkodePay API key</label>
                <input
                  required
                  type="password"
                  placeholder="sk_..."
                  value={skodePayKey}
                  onChange={(e) => setSkodePayKey(e.target.value)}
                  className={inputClass}
                />
              </div>
              {skodePayError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{skodePayError}</p>
              )}
              <p className="text-xs text-[var(--color-ink-300)]">
                If you skip this, buyers can still pay you directly via
                bKash/Nagad and submit a transaction ID.
              </p>
              <button
                type="submit"
                disabled={savingSkodePay}
                className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
              >
                {savingSkodePay ? "Connecting..." : "Connect SkodePay"}
              </button>
            </form>
          )}
        </div>
      )}

      {section === "location" && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-5 space-y-3 max-w-md">
          <p className="text-xs text-[var(--color-ink-500)]">
            Tap anywhere on the map to drop a pin at your shop's real
            location. This appears on your storefront so buyers can see
            exactly where you are — a free OpenStreetMap map, no Google
            account needed.
          </p>
          <LocationPicker
            lat={pin?.lat}
            lng={pin?.lng}
            onChange={(lat, lng) => {
              setPin({ lat, lng });
              setLocationSaved(false);
            }}
          />
          {pin && (
            <p className="text-xs text-[var(--color-ink-500)]">
              Pinned at {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
            </p>
          )}
          {locationSaved && (
            <p className="text-xs text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2">
              Saved.
            </p>
          )}
          <button
            onClick={saveLocation}
            disabled={!pin || savingLocation}
            className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
          >
            {savingLocation ? "Saving..." : "Save location"}
          </button>
        </div>
      )}

      {section === "verification" && (
        <div className="bg-white rounded-[var(--radius-card)] shadow-card p-5 space-y-4 max-w-md">
          {verificationStatus === "VERIFIED" ? (
            <p className="text-sm text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2.5">
              ✓ Your shop is Verified. Buyers see a Verified badge on your storefront.
            </p>
          ) : verificationStatus === "PENDING_REVIEW" ? (
            <p className="text-sm text-[var(--color-gold-600)] bg-[var(--color-gold-50)] rounded-lg px-3 py-2.5">
              Your documents are submitted and waiting for admin review.
            </p>
          ) : (
            <>
              <p className="text-xs text-[var(--color-ink-500)]">
                Upload a trade license OR an NID (national ID) photo — at
                least one is required. You can upload both for a stronger
                review. Once approved, your shop shows a Verified badge so
                buyers know exactly who they're buying from.
              </p>
              {org.verificationStatus === "REJECTED" && org.verificationNote && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  Previous submission was rejected: {org.verificationNote}
                </p>
              )}
              <ImageUploadField
                value={tradeLicenseUrl}
                onChange={(url) => setTradeLicenseUrl(url)}
                label="Trade license photo"
              />
              <ImageUploadField
                value={nidUrl}
                onChange={(url) => setNidUrl(url)}
                label="NID photo"
              />
              {verificationError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {verificationError}
                </p>
              )}
              {verificationSubmitted && (
                <p className="text-xs text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2">
                  Submitted for review.
                </p>
              )}
              <button
                onClick={submitVerification}
                disabled={submittingVerification || (!tradeLicenseUrl && !nidUrl)}
                className="bg-[var(--color-emerald-700)] text-white rounded-[var(--radius-pill)] px-5 py-2 text-sm font-medium hover:bg-[var(--color-emerald-900)] disabled:opacity-50"
              >
                {submittingVerification ? "Submitting..." : "Submit for verification"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
