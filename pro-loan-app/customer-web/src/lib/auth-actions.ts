"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8180";

export async function loginAction(_prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/v1/auth/customer/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { error: "Cannot reach the server. Please try again." };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.error ?? "Login failed" };
  }

  let token: string | undefined;
  let subject_id: string | undefined;
  try {
    const json = await res.json();
    token = json.token;
    subject_id = json.subject_id;
  } catch {
    return { error: "Unexpected server response. Please try again." };
  }

  if (!token || !subject_id) {
    return { error: "Login response missing credentials." };
  }

  const jar = await cookies();
  jar.set("customer_auth_token", token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  jar.set("customer_id", subject_id, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  redirect("/");
}

export async function registerAction(_prevState: unknown, formData: FormData) {
  const body = {
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
  };

  const res = await fetch(`${API_URL}/api/v1/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error ?? "Registration failed" };
  }

  redirect("/login");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete("customer_auth_token");
  jar.delete("customer_id");
  redirect("/login");
}
