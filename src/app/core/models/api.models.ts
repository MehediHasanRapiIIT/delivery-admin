// Admin session stored after successful OTP verification
export interface AdminSession {
  userId: string;
  token: string;
  phoneNumber: string;
}

// --- Auth ---
export interface OtpGenerateRequest {
  phoneNumber: string;
}

export interface OtpVerifyRequest {
  phoneNumber: string;
  otpCode: string;
}

export interface OtpVerifyResponse {
  userId: string;
  phoneNumber: string;
  token: string;
  isNewUser: boolean;
}

// --- Products ---
export interface ProductRequest {
  categoryId: number;
  name: string;
  description: string;
  price: number;
  discountPercentage?: number;
  shopId: number;
  isAvailable: boolean;
}

export interface ProductResponse {
  id: number;
  categoryId: number;
  categoryName: string | null;
  sku: string | null;
  unit: string | null;
  name: string;
  description: string;
  price: number;
  discountPrice: number;
  imageUrl: string;
  isAvailable: boolean;
  stockQuantity: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  avgRating: number;
  totalReviews: number;
}

// --- Stock ---
export interface StockUpdateRequest {
  operation: 'SET' | 'INCREMENT' | 'DECREMENT';
  quantity: number;
  unit?: string;
  lowStockThreshold?: number;
}

export interface BulkStockItem {
  productId: number;
  quantity: number;
  unit?: string;
  lowStockThreshold?: number;
}

export interface BulkStockUpdateRequest {
  updates: BulkStockItem[];
}

export interface StockResponse {
  productId: number;
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  unit: string;
  stockQuantity: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lowStockThreshold: number | null;
}

export interface InventorySummary {
  criticalLow: number;
  outOfStock: number;
  reorderPending: number;
}

// --- Categories ---
export interface CategoryRequest {
  name: string;
  isActive: boolean;
}

export interface CategoryResponse {
  id: number;
  name: string;
  isActive: boolean;
  productCount: number;
}

// --- Banners ---
export interface BannerResponse {
  id: string;
  imageUrl: string;
  promotionTitle: string;
  promotionDetails: string;
  fromDate: string;
  toDate: string;
}

// --- Home / Dashboard ---
export interface HomeResponse {
  banners: BannerResponse[];
  categories: CategoryResponse[];
  popularItems: ProductResponse[];
  featuredItems: ProductResponse[];
}

// --- Orders ---
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | null;
  productName: string | null;
  imageUrl: string | null;
  quantity: number;
  priceAtOrder: number;
  variantId: number | null;
}

export interface OrderResponse {
  id: string;
  clientId: string;
  riderId: string | null;
  deliveryAddress: string;
  totalAmount: number;
  paymentMethod: string;
  paymentId: string | null;
  orderStatus: string;
  shopId: number;
  createdAt: string;
  deliveryCharge: number;
  latitude: number;
  longitude: number;
  orderItems: OrderItem[];
  customerName: string | null;
  customerPhone: string | null;
  riderName: string | null;
  riderPhone: string | null;
  riderImageUrl: string | null;
  riderVehicleType: string | null;
  riderPlateNumber: string | null;
  riderRating: number | null;
}

export interface OrderSummary {
  total: number;
  pending: number;
  outForDelivery: number;
  completed: number;
}

// --- Reviews ---
export interface ReviewResponse {
  reviewId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface RatingSummary {
  productId: number;
  avgRating: number;
  totalReviews: number;
  starBreakdown: { [key: number]: number };
}

// --- Pagination ---
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// --- Error shapes ---
export interface ApiValidationError {
  errors: Record<string, string>;
  timestamp: string;
}

export interface ApiBusinessError {
  message: string;
  timestamp: string;
}
