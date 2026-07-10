"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";

export async function createProductAction(_prevState: unknown, formData: FormData) {
  const currency = ((formData.get("currency") as string) || "").trim().toUpperCase();
  if (!currency) {
    return { error: "Currency is required" };
  }

  const body = {
    name: formData.get("name") as string,
    currency,
    principal_min_cents: Math.round(
      parseFloat(formData.get("min_amount") as string) * 100
    ),
    principal_max_cents: Math.round(
      parseFloat(formData.get("max_amount") as string) * 100
    ),
    annual_interest_bps: Math.round(
      parseFloat(formData.get("annual_rate") as string) * 100
    ),
    origination_fee_bps: Math.round(
      parseFloat((formData.get("origination_fee") as string) || "0") * 100
    ),
    term_months: parseInt(formData.get("term_months") as string, 10),
    repayment_frequency: "monthly",
  };

  try {
    await api.post("/products", body);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to create product" };
  }

  revalidatePath("/products");
  return { success: true };
}
