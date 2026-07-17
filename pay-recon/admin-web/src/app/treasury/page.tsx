import { api } from "@/lib/api";
import { formatNGN } from "@/lib/money";
import { getHorizonUrl } from "@/lib/urls";

type BankCashPosition = {
  operating_indicator: string;
  balance_kobo: number;
  currency: string;
  sync_note: string;
};

export default async function TreasuryPage() {
  let position: BankCashPosition | null = null;
  let loadError: string | null = null;
  try {
    position = await api.get<BankCashPosition>("/treasury/bank-cash");
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Failed to load bank cash";
  }

  const horizon = getHorizonUrl();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Bank cash</h1>
        <p className="mt-1 text-sm text-muted">
          Ledger mirror of your company operating account. Cash enters here when you upload a
          bank statement — PayRecon does not connect to the bank directly.
        </p>
      </div>

      {loadError && (
        <p className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error ring-1 ring-error/20">
          {loadError}
        </p>
      )}

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold text-ink">Operating account balance</h2>
        {position ? (
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Ledger indicator</dt>
              <dd className="font-mono font-medium text-ink">{position.operating_indicator}</dd>
            </div>
            <div>
              <dt className="text-muted">Available cash (ledger)</dt>
              <dd className="text-2xl font-semibold text-ink">
                {formatNGN(position.balance_kobo)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted">How to fund</dt>
              <dd className="mt-1 text-ink">{position.sync_note}</dd>
            </div>
          </dl>
        ) : (
          !loadError && (
            <p className="mt-3 text-sm text-muted">
              Bank cash position is unavailable. Bootstrap Blnk and retry.
            </p>
          )
        )}
      </section>

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold text-ink">Demo funding path</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Fund the company account in your bank app (Horizon in this demo).</li>
          <li>Download the operating account statement CSV.</li>
          <li>
            Upload it in Reconciliation — funding credits sync to{" "}
            {position?.operating_indicator ?? "@OperatingAccount"}.
          </li>
          <li>Create bills and pay vendors from the bank, then confirm with the bank txn ID.</li>
        </ol>
        <a
          href={`${horizon}/fund`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Open Horizon Bank to fund →
        </a>
      </section>
    </div>
  );
}
