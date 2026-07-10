"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";

export type TreasuryStatus = {
  status: {
    currency: string;
    funding_pool_indicator: string;
    world_indicator: string;
    funding_pool_balance_cents: number;
    world_balance_cents: number;
  };
  recent_prefunds: {
    id: string;
    reference: string;
    amount_cents: number;
    currency: string;
    blnk_transaction_id?: string;
    created_at: string;
  }[];
};

export async function getTreasuryStatus(currency: string): Promise<TreasuryStatus> {
  return api.get<TreasuryStatus>(
    `/platform/treasury?currency=${encodeURIComponent(currency)}`
  );
}

export async function prefundFundingPoolAction(input: {
  currency: string;
  amountCents: number;
  description?: string;
  reference: string;
}) {
  try {
    const result = await api.post<{
      transaction_id: string;
      reference: string;
      currency: string;
      amount_cents: number;
      funding_pool_balance_cents: number;
    }>("/platform/treasury/prefund", {
      currency: input.currency,
      amount_cents: input.amountCents,
      description: input.description,
      reference: input.reference,
    });
    revalidatePath("/treasury");
    return { success: true as const, result };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Prefund failed",
    };
  }
}
