"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import type { Product, Category, ProductVariant, Organization, ShopQuestion } from "@/lib/types";

const LocationDisplay = dynamic(() => import("@/components/LocationDisplay"), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] rounded-[14px] bg-[var(--color-cream-100)] flex items-center justify-center text-sm text-[var(--color-ink-300)]">
      Loading map...
    </div>
  ),
});

const CATEGORY_HERO_IMAGES: Record<string, string> = {
  Groceries:
    "https://images.pexels.com/photos/35000204/pexels-photo-35000204.jpeg?auto=compress&cs=tinysrgb&h=600&w=800",
  Clothing:
    "https://images.pexels.com/photos/36890954/pexels-photo-36890954.jpeg?auto=compress&cs=tinysrgb&h=600&w=800",
  Cosmetics:
    "https://images.pexels.com/photos/34643810/pexels-photo-34643810.jpeg?auto=compress&cs=tinysrgb&h=600&w=800",
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addItem, lines } = useCart();
  const [variantPicker, setVariantPicker] = useState<Product | null>(null);
  const [shopModal, setShopModal] = useState<Organization | null>(null);

  useEffect(() => {
    api.get<Category[]>("/categories?vertical=MARKETPLACE").then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
    api
      .get<Product[]>(`/products${qs}`)
      .then(setProducts)
      .catch(() =>
        setError("Could not load products. Is the backend running?"),
      )
      .finally(() => setLoading(false));
  }, [categoryId]);

  function handleAddToCart(product: Product) {
    if (product.hasVariants && product.variants.length > 0) {
      setVariantPicker(product);
    } else {
      addItem(product, null);
    }
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/banner/hero-banner.jpg"
            alt="Muktagacha — shop local online"
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
        {/* Category cards - real admin-managed taxonomy */}
        {categories.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:gap-5 mb-12">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(categoryId === c.id ? "" : c.id)}
                className={`group relative aspect-[4/3] rounded-[var(--radius-card)] overflow-hidden shadow-card hover:shadow-hover-card transition-all ${
                  categoryId === c.id
                    ? "ring-2 ring-[var(--color-emerald-600)] ring-offset-2 ring-offset-[var(--color-cream-50)]"
                    : ""
                }`}
              >
                <Image
                  src={
                    CATEGORY_HERO_IMAGES[c.name] ??
                    CATEGORY_HERO_IMAGES.Groceries
                  }
                  alt={c.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 33vw, 200px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink-900)]/70 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 text-[var(--color-cream-50)] font-display font-semibold text-sm sm:text-lg">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[var(--color-ink-900)]">
              {selectedCategory ? selectedCategory.name : "All products"}
            </h2>
            <p className="text-[var(--color-ink-500)] text-sm mt-1">
              {products.length} item{products.length === 1 ? "" : "s"} from
              local vendors
            </p>
          </div>
          {categoryId && (
            <button
              onClick={() => setCategoryId("")}
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

        {!loading && !error && products.length === 0 && (
          <div className="rounded-[var(--radius-card)] bg-[var(--color-cream-100)] p-10 text-center">
            <p className="text-[var(--color-ink-500)]">
              No products yet in this category. Check back soon!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-[var(--radius-card)] shadow-card hover:shadow-hover-card transition-shadow overflow-hidden flex flex-col"
            >
              {product.images?.[0]?.url && (
                <div className="relative aspect-[4/3] bg-[var(--color-cream-100)]">
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="p-5 flex flex-col flex-1">
                <button
                  onClick={() => product.organization && setShopModal(product.organization)}
                  className="text-xs text-[var(--color-ink-500)] mb-1.5 hover:text-[var(--color-emerald-700)] hover:underline text-left"
                >
                  {product.organization?.name ?? "Local vendor"}
                </button>
                <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)] mb-1">
                  {product.name}
                </h3>
                <p className="text-[var(--color-ink-500)] text-sm mb-4">
                  {product.category?.name ?? ""}
                </p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-semibold text-[var(--color-emerald-700)] text-lg">
                    {product.hasVariants ? "From " : ""}৳{product.basePrice}
                  </span>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="bg-[var(--color-emerald-700)] text-[var(--color-cream-50)] px-4 py-2 rounded-[var(--radius-pill)] text-sm font-medium hover:bg-[var(--color-emerald-900)] transition-colors"
                  >
                    {product.hasVariants ? "Choose options" : "Add to cart"}
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

      {variantPicker && (
        <VariantPickerModal
          product={variantPicker}
          onClose={() => setVariantPicker(null)}
          onSelect={(variant) => {
            addItem(variantPicker, variant);
            setVariantPicker(null);
          }}
        />
      )}

      {shopModal && (
        <ShopInfoModal org={shopModal} onClose={() => setShopModal(null)} />
      )}
    </div>
  );
}

function ShopInfoModal({ org, onClose }: { org: Organization; onClose: () => void }) {
  const lat = org.latitude ? Number(org.latitude) : null;
  const lng = org.longitude ? Number(org.longitude) : null;
  const { user, token } = useAuth();
  const [messageError, setMessageError] = useState<string | null>(null);
  const [firstMessage, setFirstMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function handleStartConversation() {
    if (!user || !token) {
      setMessageError("Log in to message this shop.");
      return;
    }
    if (user.role !== "BUYER") {
      setMessageError("Only buyer accounts can message a shop directly.");
      return;
    }
    if (!firstMessage.trim()) return;
    try {
      await api.post("/chat/conversations", { organizationId: org.id, body: firstMessage.trim() }, token);
      setSent(true);
    } catch (err) {
      const e = err as { message?: string | string[] };
      setMessageError(Array.isArray(e.message) ? e.message[0] : e.message ?? "Could not send message");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-[var(--color-ink-900)]/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[var(--radius-card)] shadow-elevated max-w-sm w-full p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)] mb-1">
          {org.name}
        </h3>
        <p className="text-sm text-[var(--color-ink-500)] mb-4">
          {org.area}
          {org.ward ? ` · ${org.ward}` : ""}
        </p>

        {lat != null && lng != null ? (
          <div className="mb-4">
            <LocationDisplay lat={lat} lng={lng} label={org.name} height={200} />
            <a
              href={`https://www.openstreetmap.org/directions?from=&to=${lat}%2C${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[var(--color-emerald-700)] font-medium hover:underline mt-2"
            >
              📍 Get directions
            </a>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-ink-500)] bg-[var(--color-cream-100)] rounded-lg px-3 py-2.5 mb-4">
            This shop hasn't pinned their exact location yet — you can still
            order and they'll coordinate delivery with you directly.
          </p>
        )}

        {/* Message the shop (buyer-initiated only, per the chat rule) */}
        <div className="border-t border-[var(--color-border)] pt-4 mb-4">
          <h4 className="text-sm font-semibold text-[var(--color-ink-900)] mb-2">
            Message this shop
          </h4>
          {sent ? (
            <p className="text-sm text-[var(--color-emerald-700)] bg-[var(--color-emerald-50)] rounded-lg px-3 py-2.5">
              Sent! Open the chat bubble (bottom right) to continue the conversation.
            </p>
          ) : (
            <>
              <textarea
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder="Ask a question or say what you need…"
                rows={2}
                className="w-full text-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 mb-2 outline-none focus:border-[var(--color-emerald-500)]"
              />
              {messageError && <p className="text-xs text-red-600 mb-2">{messageError}</p>}
              <button
                onClick={handleStartConversation}
                disabled={!firstMessage.trim()}
                className="w-full bg-[var(--color-emerald-600)] text-white text-sm font-medium rounded-[var(--radius-pill)] py-2 disabled:opacity-40"
              >
                Send message
              </button>
            </>
          )}
        </div>

        {/* Public Q&A board - "the common place where everyone can chat" */}
        <ShopQABoard organizationId={org.id} />

        <button
          onClick={onClose}
          className="w-full text-sm text-[var(--color-ink-500)] text-center py-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function ShopQABoard({ organizationId }: { organizationId: string }) {
  const { user, token } = useAuth();
  const [questions, setQuestions] = useState<ShopQuestion[]>([]);
  const [draft, setDraft] = useState("");
  const [anonAsk, setAnonAsk] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [anonReply, setAnonReply] = useState<Record<string, boolean>>({});

  function load() {
    api.get<ShopQuestion[]>(`/chat/shops/${organizationId}/questions`).then(setQuestions).catch(() => {});
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function handleAsk() {
    if (!draft.trim() || !token) return;
    const body = draft.trim();
    const isAnonymous = anonAsk;
    setDraft("");
    setAnonAsk(false);
    await api.post(`/chat/shops/${organizationId}/questions`, { body, isAnonymous }, token);
    load();
  }

  async function handleReply(questionId: string) {
    const body = (replyDrafts[questionId] || "").trim();
    if (!body || !token) return;
    const isAnonymous = !!anonReply[questionId];
    setReplyDrafts((prev) => ({ ...prev, [questionId]: "" }));
    setAnonReply((prev) => ({ ...prev, [questionId]: false }));
    await api.post(`/chat/questions/${questionId}/replies`, { body, isAnonymous }, token);
    load();
  }

  async function handleVote(replyId: string, direction: "UP" | "DOWN") {
    if (!token) return;
    const result = await api.post<{ score: number }>(`/chat/replies/${replyId}/vote/${direction.toLowerCase()}`, {}, token);
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        replies: q.replies
          .map((r) => (r.id === replyId ? { ...r, score: result.score } : r))
          .sort((a, b) => b.score - a.score),
      }))
    );
  }

  return (
    <div className="border-t border-[var(--color-border)] pt-4 mb-2">
      <h4 className="text-sm font-semibold text-[var(--color-ink-900)] mb-2">
        Questions &amp; answers
      </h4>
      <p className="text-xs text-[var(--color-ink-500)] mb-3">
        Public — ask a question, the community answers, best answers rise to the top.
      </p>

      {user && token && (
        <div className="mb-3">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask a question…"
              className="flex-1 text-sm rounded-[var(--radius-pill)] border border-[var(--color-border)] px-3 py-1.5 outline-none focus:border-[var(--color-emerald-500)]"
            />
            <button
              onClick={handleAsk}
              disabled={!draft.trim()}
              className="text-sm font-medium text-[var(--color-emerald-700)] disabled:opacity-40 shrink-0"
            >
              Ask
            </button>
          </div>
          <label className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--color-ink-500)] cursor-pointer">
            <input
              type="checkbox"
              checked={anonAsk}
              onChange={(e) => setAnonAsk(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            Post anonymously
          </label>
        </div>
      )}

      {questions.length === 0 ? (
        <p className="text-xs text-[var(--color-ink-500)]">No questions yet — be the first to ask.</p>
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {questions.map((q) => (
            <div key={q.id} className="bg-[var(--color-cream-100)] rounded-[var(--radius-sm)] p-2.5">
              <p className="text-xs font-medium text-[var(--color-ink-900)]">
                {q.isAnonymous ? <span className="italic text-[var(--color-ink-500)]">Anonymous</span> : q.asker?.fullName ?? "Someone"}
              </p>
              <p className="text-sm text-[var(--color-ink-700)] mb-1.5">{q.body}</p>
              {q.replies.map((r) => (
                <div key={r.id} className="ml-1 mt-1.5 flex gap-2 items-start">
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <button
                      onClick={() => handleVote(r.id, "UP")}
                      className="text-xs leading-none text-[var(--color-ink-500)] hover:text-[var(--color-emerald-700)]"
                      aria-label="Upvote"
                    >
                      ▲
                    </button>
                    <span className="text-xs font-semibold text-[var(--color-ink-700)]">{r.score}</span>
                    <button
                      onClick={() => handleVote(r.id, "DOWN")}
                      className="text-xs leading-none text-[var(--color-ink-500)] hover:text-red-600"
                      aria-label="Downvote"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="text-sm">
                    <span className={`font-medium ${r.isAnonymous ? "italic text-[var(--color-ink-500)]" : "text-[var(--color-emerald-700)]"}`}>
                      {r.isAnonymous ? "Anonymous" : r.author?.fullName ?? "Reply"}:
                    </span>{" "}
                    <span className="text-[var(--color-ink-700)]">{r.body}</span>
                  </div>
                </div>
              ))}
              {user && token && (
                <div className="mt-1.5">
                  <div className="flex gap-2">
                    <input
                      value={replyDrafts[q.id] || ""}
                      onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleReply(q.id)}
                      placeholder="Reply…"
                      className="flex-1 text-xs rounded-[var(--radius-pill)] border border-[var(--color-border)] px-2.5 py-1 outline-none"
                    />
                    <button
                      onClick={() => handleReply(q.id)}
                      className="text-xs font-medium text-[var(--color-emerald-700)] shrink-0"
                    >
                      Reply
                    </button>
                  </div>
                  <label className="flex items-center gap-1.5 mt-1 text-[10px] text-[var(--color-ink-500)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!anonReply[q.id]}
                      onChange={(e) => setAnonReply((prev) => ({ ...prev, [q.id]: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    Reply anonymously
                  </label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantPickerModal({
  product,
  onClose,
  onSelect,
}: {
  product: Product;
  onClose: () => void;
  onSelect: (variant: ProductVariant) => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-[var(--color-ink-900)]/50 flex items-end sm:items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[var(--radius-card)] shadow-elevated max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display font-semibold text-lg text-[var(--color-ink-900)] mb-1">
          {product.name}
        </h3>
        <p className="text-sm text-[var(--color-ink-500)] mb-4">
          Choose an option
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {product.variants
            .filter((v) => v.isActive && v.stockCount > 0)
            .map((v) => (
              <button
                key={v.id}
                onClick={() => onSelect(v)}
                className="w-full flex items-center justify-between border border-[var(--color-border)] rounded-[12px] px-4 py-3 text-left hover:border-[var(--color-emerald-600)] hover:bg-[var(--color-emerald-50)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--color-ink-900)]">
                  {Object.entries(v.optionValues)
                    .map(([, val]) => val)
                    .join(" / ")}
                </span>
                <span className="text-sm font-semibold text-[var(--color-emerald-700)]">
                  ৳{v.priceOverride ?? product.basePrice}
                </span>
              </button>
            ))}
          {product.variants.filter((v) => v.isActive && v.stockCount > 0)
            .length === 0 && (
            <p className="text-sm text-[var(--color-ink-500)]">
              Out of stock right now.
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="mt-4 text-sm text-[var(--color-ink-500)] w-full text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
