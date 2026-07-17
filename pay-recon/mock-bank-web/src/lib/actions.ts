"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bankApi, nairaToKobo, type ActionState, type BankAccount, type Transfer } from "@/lib/api";

export async function createBeneficiaryAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await bankApi.post("/accounts", {
      account_number: String(formData.get("account_number") ?? "").trim(),
      account_name: String(formData.get("account_name") ?? "").trim(),
      balance: 0,
      account_type: "beneficiary",
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Add beneficiary failed" };
  }
  revalidatePath("/");
  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function fundAccountAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState & { account?: BankAccount }> {
  try {
    const account = await bankApi.post<BankAccount>("/accounts/operating/fund", {
      amount: nairaToKobo(String(formData.get("amount_naira") ?? "")),
      reference: String(formData.get("reference") ?? "").trim(),
    });
    revalidatePath("/");
    revalidatePath("/fund");
    revalidatePath("/statements");
    return { success: "Account funded.", account };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Funding failed" };
  }
}

export async function transferAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState & { transfer?: Transfer; billId?: string }> {
  try {
    const transfer = await bankApi.post<Transfer>("/transfers", {
      from_account_id: String(formData.get("from_account_id") ?? "").trim(),
      to_account_id: String(formData.get("to_account_id") ?? "").trim(),
      amount: nairaToKobo(String(formData.get("amount_naira") ?? "")),
      narration: String(formData.get("narration") ?? "").trim(),
    });
    const billId = String(formData.get("bill_id") ?? "").trim();
    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/fund");
    revalidatePath("/transfers");
    revalidatePath("/statements");
    return {
      success: "Transfer completed.",
      transfer,
      billId: billId || undefined,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Transfer failed" };
  }
}
