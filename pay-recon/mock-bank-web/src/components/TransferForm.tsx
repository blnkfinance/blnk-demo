"use client";

import { useActionState } from "react";
import { transferAction } from "@/lib/actions";
import type { ActionState, BankAccount, Transfer } from "@/lib/api";
import { formatNGN } from "@/lib/api";
import CopyButton from "@/components/CopyButton";
import { getAdminUrl } from "@/lib/urls";

const inputClass =
  "rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-bank focus:ring-2 focus:ring-bank/30";

type TransferDefaults = {
  billId?: string;
  amountNaira?: string;
  beneficiaryAccount?: string;
  narration?: string;
};

export default function TransferForm({
  accounts,
  defaults,
}: {
  accounts: BankAccount[];
  defaults?: TransferDefaults;
}) {
  const [state, formAction, pending] = useActionState<
    (ActionState & { transfer?: Transfer; billId?: string }) | undefined,
    FormData
  >(transferAction, undefined);

  const operating = accounts.find((a) => a.account_type === "operating");
  const beneficiaries = accounts.filter((a) => a.account_type !== "operating");

  const defaultToAccount =
    defaults?.beneficiaryAccount &&
    accounts.find((a) => a.account_number === defaults.beneficiaryAccount)?.id;

  const transfer = state?.transfer;
  const billId = state?.billId ?? defaults?.billId;
  const payReconReturnUrl =
    transfer?.bank_transaction_id && billId
      ? `${getAdminUrl()}/bills?confirmBill=${encodeURIComponent(billId)}&bankTxn=${encodeURIComponent(transfer.bank_transaction_id)}`
      : null;

  return (
    <div className="flex flex-col gap-6">
      <form action={formAction} className="grid max-w-xl gap-4">
        {billId && <input type="hidden" name="bill_id" value={billId} />}
        {operating && <input type="hidden" name="from_account_id" value={operating.id} />}
        {operating && (
          <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-border">
            <p className="text-xs uppercase tracking-wider text-muted">From</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {operating.account_name} · {operating.account_number}
            </p>
            <p className="text-xs text-muted">Available balance: {formatNGN(operating.balance)}</p>
          </div>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">To (credit)</span>
          <select
            name="to_account_id"
            required
            className={inputClass}
            defaultValue={defaultToAccount ?? ""}
          >
            <option value="" disabled>
              Select beneficiary
            </option>
            {beneficiaries.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_name} · {a.account_number}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Amount (NGN)</span>
          <input
            name="amount_naira"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={defaults?.amountNaira ?? ""}
            className={inputClass}
            placeholder="1900000"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Narration (optional)</span>
          <input
            name="narration"
            className={inputClass}
            defaultValue={defaults?.narration ?? ""}
            placeholder="Vendor payment or PR-20260715-0001"
          />
          <span className="text-xs text-muted">
            Optional. PayRecon matches primarily on the bank transaction ID, not narration.
          </span>
        </label>
        {state?.error && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending || !operating || beneficiaries.length === 0}
          className="rounded-lg bg-bank px-4 py-2.5 text-sm font-semibold text-white hover:bg-bank-dark disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send transfer"}
        </button>
      </form>

      {transfer && (
        <div className="max-w-xl rounded-2xl bg-surface-elevated p-5 ring-1 ring-border">
          <h3 className="font-semibold text-ink">Transfer completed</h3>
          <p className="mt-1 text-sm text-muted">
            Copy this bank transaction ID into PayRecon when confirming payment.
          </p>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-muted">Bank transaction ID</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-mono font-medium text-ink">
                <span>{transfer.bank_transaction_id}</span>
                <CopyButton value={transfer.bank_transaction_id} label="Copy bank transaction ID" />
              </dd>
            </div>
            <div>
              <dt className="text-muted">Amount</dt>
              <dd className="mt-0.5 flex items-center gap-1.5 font-medium text-ink">
                <span>{formatNGN(transfer.amount)}</span>
                <CopyButton
                  value={(transfer.amount / 100).toFixed(2)}
                  label="Copy amount"
                />
              </dd>
            </div>
            {transfer.narration && (
              <div>
                <dt className="text-muted">Narration</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-ink">
                  <span>{transfer.narration}</span>
                  <CopyButton value={transfer.narration} label="Copy narration" />
                </dd>
              </div>
            )}
          </dl>
          {payReconReturnUrl && (
            <a
              href={payReconReturnUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex rounded-lg bg-bank px-4 py-2 text-sm font-semibold text-white hover:bg-bank-dark"
            >
              Return to PayRecon to confirm →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
