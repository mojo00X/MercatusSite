import client from "./client";
import type { Order, PaginatedResponse, AdminStats } from "../types";

export async function getOrders(): Promise<Order[]> {
  const { data } = await client.get("/orders");
  return data;
}

export async function getOrder(id: number): Promise<Order> {
  const { data } = await client.get(`/orders/${id}`);
  return data;
}

export async function createCheckoutSession(): Promise<{ url: string }> {
  const { data } = await client.post("/orders/checkout");
  return data;
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
  const { data } = await client.get("/admin/stats");
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
