"use client";

import { useActionState } from "react";
import { uploadAndReconcileAction } from "@/lib/actions";
import type { ActionState } from "@/lib/types";
import FormFeedback from "@/components/FormFeedback";
import { SelectField, SubmitButton } from "@/components/Field";

export default function ReconcileUploadForm() {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    uploadAndReconcileAction,
    undefined
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <SelectField label="Reconciliation period" name="cadence" defaultValue="daily">
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </SelectField>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Bank statement CSV</span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand"
        />
      </label>
      <p className="text-xs text-muted">
        Export the statement for your chosen period from Horizon Bank → Statements (pick matching
        from/to dates). The cadence here is a label only — it does not filter rows. Previously
        imported transactions are skipped automatically.
      </p>
      <FormFeedback error={state?.error} />
      <SubmitButton
        pending={pending}
        label="Upload & run reconciliation"
        pendingLabel="Reconciling…"
      />
    </form>
  );
}
