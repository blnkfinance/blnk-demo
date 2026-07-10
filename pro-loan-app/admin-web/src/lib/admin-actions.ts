"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";

export async function inviteAdminAction(_prevState: unknown, formData: FormData) {
  const body = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  try {
    await api.post("/admins", body);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create admin" };
  }

  revalidatePath("/admins");
  return { success: true };
}
