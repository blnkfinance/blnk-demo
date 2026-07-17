"use server";

import { revalidatePath } from "next/cache";
import { api } from "./api";

export async function resolveRecipientAction(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { error: "Recipient email is required" as const };
  }

  try {
    const result = await api.get<{ email: string; display_name: string }>(
      `/transfers/resolve-recipient?email=${encodeURIComponent(trimmed)}`
    );
    return { recipient: result };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Recipient not found",
    };
  }
}

export async function sendMoneyAction(
  _prevState: unknown,
  formData: FormData
) {
  const recipientEmail = formData.get("recipient_email") as string;
  const recipientType = (formData.get("recipient_type") as string) || "internal";
  const currency = ((formData.get("currency") as string) || "NGN").toUpperCase();
  const amount = parseFloat(formData.get("amount") as string);
  const description = (formData.get("description") as string) || "";

  if (recipientType === "internal" && !recipientEmail) {
    return { error: "Recipient email is required" };
  }
  if (!amount || amount <= 0) return { error: "Invalid amount" };

  const amountCents = Math.round(amount * 100);

  try {
    const result = await api.post<{
      sender_balance: number;
      fees: { total_charge_cents: number };
    }>("/transfers", {
      recipient_email: recipientEmail,
      recipient_type: recipientType,
      amount_cents: amountCents,
      currency,
      description,
    });

    revalidatePath("/");
    return { success: true, balance: result.sender_balance, currency };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Transfer failed" };
  }
}

export async function getTransferFeesAction(currency: string, external = false) {
  try {
    return await api.get<{ total_charge_cents: number }>(
      `/config/transfer-fees?currency=${currency}&external=${external}`
    );
  } catch {
    return { total_charge_cents: 5000 };
  }
}
