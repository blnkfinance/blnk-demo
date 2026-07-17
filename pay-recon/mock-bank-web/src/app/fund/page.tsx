import FundAccountForm from "@/components/FundAccountForm";
import { bankApi, type BankAccount } from "@/lib/api";

export default async function FundPage() {
  let operating: BankAccount | null = null;
  try {
    operating = await bankApi.get<BankAccount>("/accounts/operating");
  } catch {
    operating = null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-3xl text-ink">Fund account</h1>
        <p className="mt-1 text-sm text-muted">
          Add cash to the company operating account before sending vendor payments.
        </p>
      </div>

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        {operating ? (
          <FundAccountForm account={operating} />
        ) : (
          <p className="text-sm text-muted">Operating account is not available yet.</p>
        )}
      </section>
    </div>
  );
}
