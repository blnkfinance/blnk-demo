import TransferForm from "@/components/TransferForm";
import { bankApi, type BankAccount } from "@/lib/api";

type SearchParams = {
  billId?: string;
  amount?: string;
  beneficiaryAccount?: string;
  narration?: string;
};

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  let accounts: BankAccount[] = [];
  try {
    const res = await bankApi.get<{ items: BankAccount[] }>("/accounts");
    accounts = res.items ?? [];
  } catch {
    accounts = [];
  }
  const operating = accounts.find((a) => a.account_type === "operating");
  const beneficiaries = accounts.filter((a) => a.account_type !== "operating");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Transfers</h1>
        <p className="mt-1 text-sm text-muted">
          Send payments from the operating account. Copy the bank transaction ID back to PayRecon
          after sending.
        </p>
      </div>

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        {!operating || beneficiaries.length === 0 ? (
          <p className="text-sm text-muted">
            Funded company account and at least one beneficiary are required before transferring.
            Add beneficiaries under Beneficiaries.
          </p>
        ) : (
          <TransferForm
            accounts={accounts}
            defaults={{
              billId: params.billId,
              amountNaira: params.amount,
              beneficiaryAccount: params.beneficiaryAccount,
              narration: params.narration,
            }}
          />
        )}
      </section>
    </div>
  );
}
