"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { nairaToKobo } from "@/lib/money";
import type { ActionState, Bill, PaymentInstruction, Remittance } from "@/lib/types";

export async function createMerchantAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await api.post("/merchants", {
      name: String(formData.get("name") ?? "").trim(),
      tin: String(formData.get("tin") ?? "").trim(),
      bank_account_number: String(formData.get("bank_account_number") ?? "").trim(),
      bank_name: String(formData.get("bank_name") ?? "").trim(),
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Create merchant failed" };
  }
  revalidatePath("/merchants");
  redirect("/merchants");
}

export async function createBillAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    const gross = nairaToKobo(String(formData.get("gross_amount_naira") ?? ""));
    const res = await api.post<{
      bill: Bill;
      payment_instruction: PaymentInstruction;
    }>("/bills", {
      merchant_id: String(formData.get("merchant_id") ?? "").trim(),
      wht_category_id: String(formData.get("wht_category_id") ?? "").trim(),
      purpose: String(formData.get("purpose") ?? "").trim(),
      gross_amount: gross,
      vendor_invoice_ref: String(formData.get("vendor_invoice_ref") ?? "").trim(),
    });
    revalidatePath("/bills");
    return {
      success: "Bill created. Use the payment instruction below in Horizon Bank.",
      data: {
        bill: res.bill,
        payment_instruction: res.payment_instruction,
      },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Create bill failed" };
  }
}

export async function uploadAndReconcileAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  let runID = "";
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose a statement CSV file" };
    }

    const body = new FormData();
    body.append("file", file);
    body.append("source", "mock-bank");
    const cadence = String(formData.get("cadence") ?? "daily");
    body.append("cadence", cadence);

    const upload = await api.postForm<{ id: string }>("/reconciliation/upload", body);
    const run = await api.post<{ id: string }>("/reconciliation/runs", {
      upload_id: upload.id,
    });
    runID = run.id;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Reconciliation failed" };
  }

  revalidatePath("/reconciliation");
  redirect(`/reconciliation?run=${runID}`);
}

export async function confirmBillPaymentAction(
  billID: string,
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    await api.post<Bill>(`/bills/${billID}/confirm-payment`, {
      bank_payment_reference: String(formData.get("bank_payment_reference") ?? "").trim(),
      bank_payment_date: String(formData.get("bank_payment_date") ?? "").trim(),
      payment_note: String(formData.get("payment_note") ?? "").trim(),
    });
    revalidatePath("/bills");
    return { success: "Payment confirmed. This bill is now awaiting statement reconciliation." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Confirm payment failed" };
  }
}

export async function createRemittanceAction(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  try {
    const rem = await api.post<Remittance>("/tax-remittances", {
      period: String(formData.get("period") ?? "").trim(),
    });
    revalidatePath("/remittances");
    return {
      success: `Remittance created for ${rem.period}.`,
      data: { remittance: rem },
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Create remittance failed" };
  }
}

export async function confirmRemittanceAction(id: string, formData: FormData): Promise<ActionState> {
  try {
    await api.post(`/tax-remittances/${id}/confirm`, {
      bank_payment_reference: String(formData.get("bank_payment_reference") ?? "").trim(),
      bank_payment_date: String(formData.get("bank_payment_date") ?? "").trim(),
      payment_note: String(formData.get("payment_note") ?? "").trim(),
    });
    revalidatePath("/remittances");
    return { success: "Remittance payment confirmed. Upload the bank statement to reconcile." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Confirm failed" };
  }
}
