export type UserRole = "BUYER" | "VENDOR" | "PROVIDER" | "ADMIN";
export type Vertical = "MARKETPLACE" | "PHARMACY" | "SERVICES";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";
export type PaymentMethod = "CASH_ON_DELIVERY" | "BKASH" | "NAGAD";
export type PaymentVerificationStatus =
  | "NOT_SUBMITTED"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "REJECTED";

export interface User {
  id: string;
  phone: string;
  fullName: string;
  role: UserRole;
  area?: string | null;
  ward?: string | null;
  createdAt?: string;
}

export interface Organization {
  id: string;
  ownerUserId: string;
  name: string;
  logoUrl?: string | null;
  vertical: Vertical;
  area?: string | null;
  ward?: string | null;
  deliveryRadiusKm?: string | null;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  bkashNumber?: string | null;
  nagadNumber?: string | null;
  cloudinaryCloudName?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  vertical: Vertical;
  parentId?: string | null;
  children?: Category[];
  sortOrder: number;
  isActive: boolean;
}

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface ProductVariant {
  id: string;
  sku?: string | null;
  optionValues: Record<string, string>;
  priceOverride?: string | null;
  stockCount: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  organizationId: string;
  categoryId?: string | null;
  category?: Category | null;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: string;
  hasVariants: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  organization?: Organization;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantId?: string | null;
  product?: Product;
  variant?: ProductVariant | null;
  quantity: number;
  price: string;
}

export interface Order {
  id: string;
  buyerId: string;
  organizationId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentTrxId?: string | null;
  paymentVerification: PaymentVerificationStatus;
  paymentVerifiedAt?: string | null;
  createdAt: string;
  items: OrderItem[];
  organization?: Organization;
  buyer?: User;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface CloudinaryUploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
}

export interface MarketingContact {
  id: string;
  organizationId: string;
  phone: string;
  name?: string | null;
  createdAt: string;
}

export type CampaignStatus = "DRAFT" | "SENDING" | "SENT" | "FAILED";

export interface MarketingCampaign {
  id: string;
  organizationId: string;
  message: string;
  status: CampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt?: string | null;
}
