"use client";

import { useActionState } from "react";
import { createMerchantAction } from "@/lib/actions";
import type { ActionState } from "@/lib/types";
import FormFeedback from "@/components/FormFeedback";
import { SubmitButton, TextField } from "@/components/Field";

export default function CreateMerchantForm() {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    createMerchantAction,
    undefined
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <TextField label="Merchant name" name="name" required placeholder="Acme Supplies Ltd" />
      <TextField label="TIN" name="tin" required placeholder="RC-123456" />
      <TextField label="Bank name" name="bank_name" required placeholder="Access Bank" />
      <TextField
        label="Bank account number"
        name="bank_account_number"
        required
        placeholder="0123456789"
      />
      <div className="sm:col-span-2 flex flex-col gap-3">
        <FormFeedback error={state?.error} />
        <SubmitButton pending={pending} label="Add merchant" pendingLabel="Creating…" />
      </div>
    </form>
  );
}
