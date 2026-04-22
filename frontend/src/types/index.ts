export interface User {
  id: number;
  email: string;
  full_name: string;
  is_admin: boolean;
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
  is_active: boolean;
  category_id?: number;
  category?: Category;
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
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  stripe_session_id?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ProductFilters {
  category?: string;
  gender?: string;
  size?: string;
  color?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: string;
}

export interface AdminStats {
  total_revenue: number;
  total_orders: number;
  total_users: number;
  low_stock_count: number;
  recent_orders: Order[];
  revenue_chart: { date: string; revenue: number }[];
}
