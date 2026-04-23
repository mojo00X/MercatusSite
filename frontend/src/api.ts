import axios from "axios";
import type {
  User,
  Product,
  Category,
  Cart,
  Collection,
  Order,
  PaginatedResponse,
  ProductFilters,
  AdminStats,
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "";

const client = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const sessionId = localStorage.getItem("session_id");
  if (sessionId) {
    config.headers["X-Session-ID"] = sessionId;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function register(
  email: string,
  password: string,
  full_name: string
): Promise<AuthResponse> {
  const { data } = await client.post("/auth/register", {
    email,
    password,
    full_name,
  });
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await client.post("/auth/login", { email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await client.get("/auth/me");
  return data;
}

export async function updateMe(updates: Partial<User>): Promise<User> {
  const { data } = await client.put("/auth/me", updates);
  return data;
}

export async function getProducts(
  filters?: ProductFilters
): Promise<PaginatedResponse<Product>> {
  const params: Record<string, string | number> = {};
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params[key] = value;
      }
    });
  }
  const { data } = await client.get("/products", { params });
  return data;
}

export async function getProduct(slug: string): Promise<Product> {
  const { data } = await client.get(`/products/${slug}`);
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await client.get("/products/categories");
  return data;
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const { data } = await client.post("/admin/products", product);
  return data;
}

export async function updateProduct(
  id: number,
  product: Partial<Product>
): Promise<Product> {
  const { data } = await client.put(`/admin/products/${id}`, product);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await client.delete(`/admin/products/${id}`);
}

export async function getCart(): Promise<Cart> {
  const { data } = await client.get("/cart");
  return data;
}

export async function addToCart(
  variant_id: number,
  quantity: number
): Promise<Cart> {
  const { data } = await client.post("/cart/items", { variant_id, quantity });
  return data;
}

export async function updateCartItem(
  itemId: number,
  quantity: number
): Promise<Cart> {
  const { data } = await client.put(`/cart/items/${itemId}`, { quantity });
  return data;
}

export async function removeCartItem(itemId: number): Promise<Cart> {
  const { data } = await client.delete(`/cart/items/${itemId}`);
  return data;
}

export async function mergeCart(): Promise<Cart> {
  const { data } = await client.post("/cart/merge");
  return data;
}

export async function getOrders(): Promise<Order[]> {
  const { data } = await client.get("/orders");
  return data.items ?? data;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await client.get(`/orders/${id}`);
  return data;
}

export async function createCheckoutSession(): Promise<{ url: string }> {
  const { data } = await client.post("/checkout/create-session");
  return { url: data.checkout_url };
}

export async function getAllOrders(
  params?: Record<string, string | number>
): Promise<PaginatedResponse<Order>> {
  const { data } = await client.get("/admin/orders", { params });
  return data;
}

export async function updateOrderStatus(
  id: number,
  status: string
): Promise<Order> {
  const { data } = await client.put(`/admin/orders/${id}/status`, { status });
  return data;
}

export async function getAdminStats(): Promise<AdminStats> {
  const { data } = await client.get("/admin/dashboard");
  return data;
}

export async function getAdminUsers(): Promise<any[]> {
  const { data } = await client.get("/admin/users");
  return data;
}

export async function toggleAdmin(userId: number): Promise<any> {
  const { data } = await client.put(`/admin/users/${userId}/toggle-admin`);
  return data;
}

export async function updateVariantStock(
  variantId: number,
  stock: number
): Promise<any> {
  const { data } = await client.put(`/admin/variants/${variantId}/stock`, {
    stock,
  });
  return data;
}

export async function getAdminVariants(): Promise<any[]> {
  const { data } = await client.get("/admin/variants");
  return data;
}

export async function getCollections(): Promise<Collection[]> {
  const { data } = await client.get("/collections");
  return data;
}

export async function adminListCollections(): Promise<Collection[]> {
  const { data } = await client.get("/admin/collections");
  return data;
}

export async function adminCreateCollection(
  payload: Partial<Collection>
): Promise<Collection> {
  const { data } = await client.post("/admin/collections", payload);
  return data;
}

export async function adminUpdateCollection(
  id: number,
  payload: Partial<Collection>
): Promise<Collection> {
  const { data } = await client.put(`/admin/collections/${id}`, payload);
  return data;
}

export async function adminDeleteCollection(id: number): Promise<void> {
  await client.delete(`/admin/collections/${id}`);
}

export async function adminListCategories(): Promise<Category[]> {
  const { data } = await client.get("/admin/categories");
  return data;
}

export async function adminUpdateCategoryImage(
  id: number,
  image_url: string | null
): Promise<Category> {
  const { data } = await client.put(`/admin/categories/${id}/image`, {
    image_url,
  });
  return data;
}
