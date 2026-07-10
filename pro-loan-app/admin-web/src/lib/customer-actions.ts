"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";

export async function syncIdentityAction(customerId: string) {
  try {
    await api.post(`/customers/${customerId}/sync-identity`, {});
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to sync identity" };
  }

  revalidatePath("/customers");
  return { success: true };
}
