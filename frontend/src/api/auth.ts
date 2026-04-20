import client from "./client";
import type { User } from "../types";

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
  const params = new URLSearchParams();
  params.append("username", email);
  params.append("password", password);
  const { data } = await client.post("/auth/login", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
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
