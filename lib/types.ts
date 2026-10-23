export type UserRole = "BUYER" | "VENDOR" | "PROVIDER" | "ADMIN";
export type Vertical = "MARKETPLACE" | "PHARMACY" | "SERVICES";
export type ListingType = "PRODUCT" | "SERVICE" | "MEDICINE";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "CANCELLED";
export type PaymentMethod = "CASH_ON_DELIVERY" | "BKASH" | "NAGAD";

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
  vertical: Vertical;
  area?: string | null;
  ward?: string | null;
  deliveryRadiusKm?: string | null;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

export interface Listing {
  id: string;
  organizationId: string;
  type: ListingType;
  name: string;
  price?: string | null;
  category?: string | null;
  isActive: boolean;
  createdAt: string;
  organization?: Organization;
}

export interface OrderItem {
  id: string;
  orderId: string;
  listingId: string;
  quantity: number;
  price: string;
}

export interface Order {
  id: string;
  buyerId: string;
  organizationId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdAt: string;
  items: OrderItem[];
  organization?: Organization;
  buyer?: User;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}
