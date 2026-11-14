import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cacheLife, cacheTag } from "next/cache";
import ShopStorefront from "./ShopStorefront";
import type { Organization, Product } from "@/lib/types";

// Public, shareable shop page: muktagacha.skodedigital.tech/shop/<slug>
//
// Rendered on the server so that when a vendor pastes their link into
// Facebook, WhatsApp or Messenger, the preview card shows THEIR shop name,
// banner and description instead of the generic marketplace title.
//
// This app runs with `cacheComponents`, so data is dynamic by default and
// caching is explicit via "use cache" + cacheLife. A shop page is the same
// for every visitor, so it is cached and refreshed every few minutes — a
// link going viral on Facebook won't hammer the backend, and new products
// still appear quickly.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3456";
const SITE_URL = "https://muktagacha.skodedigital.tech";

type ShopData = { shop: Organization; products: Product[] };

async function getShop(slug: string): Promise<ShopData | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`shop:${slug}`);
  try {
    const res = await fetch(`${API_URL}/organizations/public/${encodeURIComponent(slug)}`);
    if (!res.ok) return null;
    return (await res.json()) as ShopData;
  } catch {
    return null;
  }
}

/**
 * Prerender the current shops at build time. Required under cacheComponents
 * (it must return at least one param). Shops created later are not listed
 * here but are still rendered on their first visit and cached after that.
 */
export async function generateStaticParams() {
  try {
    const res = await fetch(`${API_URL}/organizations`);
    if (res.ok) {
      const shops = (await res.json()) as Organization[];
      const params = shops.filter((s) => s.slug).map((s) => ({ slug: s.slug as string }));
      if (params.length) return params;
    }
  } catch {
    /* backend asleep during build — fall through */
  }
  // Must not be empty; an unknown slug simply renders the 404 page.
  return [{ slug: "muktagacha" }];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getShop(slug);
  if (!data) return { title: "Shop not found | Muktagacha" };

  const { shop, products } = data;
  const title = `${shop.name} | Muktagacha`;
  const description =
    shop.tagline ||
    shop.description?.slice(0, 160) ||
    `Shop ${products.length} products from ${shop.name}${shop.area ? ` in ${shop.area}` : ""} on Muktagacha.`;
  // Link previews (Facebook, WhatsApp) can only load an image from a real
  // URL. Older shops stored their logo as an inline base64 blob, which would
  // break the preview, so skip anything that isn't http(s) and fall back to a
  // product photo, then the marketplace banner.
  const isUrl = (u?: string | null) => !!u && /^https?:\/\//i.test(u);
  const image =
    [shop.bannerUrl, shop.logoUrl, ...products.map((p) => p.images?.[0]?.url)].find(isUrl) ??
    `${SITE_URL}/banner/hero-banner.jpg`;
  const url = `${SITE_URL}/shop/${shop.slug || shop.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: shop.name,
      description,
      url,
      siteName: "Muktagacha",
      type: "website",
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: shop.name,
      description,
      images: [image],
    },
  };
}

export default async function ShopPage({ params }: Props) {
  const { slug } = await params;
  const data = await getShop(slug);
  if (!data) notFound();
  return <ShopStorefront shop={data.shop} products={data.products} />;
}
