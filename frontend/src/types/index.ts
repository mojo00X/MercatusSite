export interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
  role?: "customer" | "boutique" | "admin";
  boutique?: { id: number; name: string; slug: string } | null;
  is_active: boolean;
  created_at: string;
}

export interface Boutique {
  id: number;
  name: string;
  slug: string;
  bio?: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_details_submitted: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
}

export interface ProductImage {
  id: number;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  product_id?: number;
  size: string;
  color: string;
  color_hex: string;
  stock_quantity: number;
  price_override?: number | null;
  sku: string;
  is_active: boolean;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  base_price: number;
  material?: string;
  gender?: string;
  condition?: "new" | "preowned";
  is_active: boolean;
  category_id?: number;
  category?: Category;
  brand_id?: number | null;
  brand?: Brand | null;
  boutique_id?: number | null;
  boutique?: { id: number; name: string; slug: string; logo_url?: string | null } | null;
  fulfillment_mode?: "self" | "platform";
  images: ProductImage[];
  variants: ProductVariant[];
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  id: number;
  variant_id: number;
  variant?: ProductVariant;
  product?: Product;
  quantity: number;
  price: number;
}

export interface Cart {
  id: number;
  user_id?: number;
  session_id?: string;
  items: CartItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  product?: Product;
}

export interface Order {
  id: number;
  user_id: number;
  status: string;
  total_amount: number;
  /** JSON string: { name?, street, city, state, zip, country }. Parse with parseShippingAddress(). */
  shipping_address?: string | null;
  stripe_session_id?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface ParsedShippingAddress {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export function parseShippingAddress(
  raw: string | null | undefined
): ParsedShippingAddress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ParsedShippingAddress;
  } catch {
    // Legacy rows may have been saved as a plain string.
    return { street: raw };
  }
  return null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ProductFilters {
  category?: string;
  brand?: string;
  gender?: string;
  condition?: "new" | "preowned";
  size?: string;
  color?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
}

export interface Collection {
  id: number;
  title: string;
  subtitle?: string;
  image_url: string;
  link_url?: string;
  button_text?: string;
  sort_order: number;
  is_active: boolean;
}

export interface AdminStats {
  total_revenue: number;
  total_orders: number;
  total_users: number;
  low_stock_count: number;
  recent_orders: Order[];
  revenue_chart: { date: string; revenue: number }[];
}
