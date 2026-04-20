import client from "./client";
import type { Product, Category, PaginatedResponse, ProductFilters } from "../types";

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
  const { data } = await client.post("/products", product);
  return data;
}

export async function updateProduct(
  id: number,
  product: Partial<Product>
): Promise<Product> {
  const { data } = await client.put(`/products/${id}`, product);
  return data;
}

export async function deleteProduct(id: number): Promise<void> {
  await client.delete(`/products/${id}`);
}
