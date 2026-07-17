import ReconcileUploadForm from "@/components/ReconcileUploadForm";
import ReconRunRefresh from "@/components/ReconRunRefresh";
import { api } from "@/lib/api";
import type { ReconRun, StatementUpload } from "@/lib/types";

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const params = await searchParams;
  let items: ReconRun[] = [];
  let activeRun: ReconRun | null = null;
  let activeUpload: StatementUpload | null = null;
  let exceptions: { id: string; exception_type: string; resolved: boolean }[] = [];

  try {
    const res = await api.get<{ items: ReconRun[] }>("/reconciliation/runs");
    items = res.items ?? [];
  } catch {
    items = [];
  }

  const runID = params.run ?? items[0]?.id;
  if (runID) {
    try {
      activeRun = await api.get<ReconRun>(`/reconciliation/runs/${runID}`);
      const ex = await api.get<{ items: typeof exceptions }>(
        `/reconciliation/runs/${runID}/exceptions`
      );
      exceptions = ex.items ?? [];
      if (activeRun.statement_upload_id) {
        try {
          activeUpload = await api.get<StatementUpload>(
            `/reconciliation/uploads/${activeRun.statement_upload_id}`
          );
        } catch {
          activeUpload = null;
        }
      }
    } catch {
      activeRun = null;
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Reconciliation</h1>
        <p className="mt-1 text-sm text-muted">
          Upload a bank statement CSV to sync funding credits into ledger cash and verify bill
          payments. Choose daily, weekly, or monthly based on the statement period you export.
        </p>
      </div>

      <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold text-ink">Import statement</h2>
        <div className="mt-4">
          <ReconcileUploadForm />
        </div>
      </section>

      {activeRun && (
        <section className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
          <ReconRunRefresh status={activeRun.status} />
          <h2 className="font-semibold text-ink">Run results</h2>
          {activeUpload && (
            <p className="mt-2 text-sm text-muted">
              Statement import ({activeUpload.cadence}): {activeUpload.rows_read} rows read,{" "}
              {activeUpload.rows_imported} new, {activeUpload.rows_skipped} previously imported
              {typeof activeUpload.credits_synced === "number"
                ? `, ${activeUpload.credits_synced} funding credit${
                    activeUpload.credits_synced === 1 ? "" : "s"
                  } synced to @OperatingAccount`
                : ""}
              .
            </p>
          )}
          {activeUpload?.blnk_note && (
            <p className="mt-2 text-sm text-warning">{activeUpload.blnk_note}</p>
          )}
          {activeRun.status === "failed" && (
            <p className="mt-2 text-sm text-error">
              Reconciliation failed while matching. Check API logs and re-upload if needed.
            </p>
          )}
          {activeRun.status === "pending" && (
            <p className="mt-2 text-sm text-brand">Matching in progress…</p>
          )}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Status</dt>
              <dd className="font-medium capitalize">{activeRun.status}</dd>
            </div>
            <div>
              <dt className="text-muted">Matched</dt>
              <dd className="font-medium">{activeRun.matched_count ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Unmatched</dt>
              <dd className="font-medium">{activeRun.unmatched_count ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Started</dt>
              <dd className="font-medium">
                {new Date(activeRun.started_at).toLocaleString()}
              </dd>
            </div>
          </dl>
          {activeRun.status === "completed" &&
            (activeRun.matched_count ?? 0) === 0 &&
            (activeRun.unmatched_count ?? 0) === 0 && (
              <p className="mt-3 text-sm text-muted">
                No bill or remittance payments to match in this statement. Funding credits (if any)
                were still synced to ledger cash above.
              </p>
            )}
          {exceptions.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-ink">Exceptions</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {exceptions.map((e) => (
                  <li key={e.id}>
                    {e.exception_type === "amount_mismatch"
                      ? "amount_mismatch — bank debit does not equal bill/remittance amount"
                      : e.exception_type}
                    {e.resolved ? " (resolved)" : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl bg-surface-elevated shadow-sm ring-1 ring-border">
        {items.length === 0 ? (
          <p className="px-6 py-8 text-sm text-muted">No reconciliation runs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Run ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Matched</th>
                <th className="px-6 py-3">Unmatched</th>
                <th className="px-6 py-3">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {items.map((run) => (
                <tr key={run.id}>
                  <td className="px-6 py-3 font-mono text-xs">
                    <a className="text-brand hover:underline" href={`/reconciliation?run=${run.id}`}>
                      {run.id.slice(0, 8)}…
                    </a>
                  </td>
                  <td className="px-6 py-3 capitalize">{run.status}</td>
                  <td className="px-6 py-3">{run.matched_count ?? "—"}</td>
                  <td className="px-6 py-3">{run.unmatched_count ?? "—"}</td>
                  <td className="px-6 py-3 text-muted">
                    {new Date(run.started_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
