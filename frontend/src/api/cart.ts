import client from "./client";
import type { Cart } from "../types";

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
