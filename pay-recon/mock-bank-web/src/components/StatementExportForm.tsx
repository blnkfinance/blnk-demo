"use client";

import { useMemo, useState } from "react";
import { getPublicBankApiBase } from "@/lib/api";

function monthBoundsUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1));
  const to = new Date(Date.UTC(y, m + 1, 0));
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default function StatementExportForm({ accountID }: { accountID: string }) {
  const defaults = useMemo(() => monthBoundsUTC(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);

  const href = `${getPublicBankApiBase()}/mock-bank/statement/export?account_id=${encodeURIComponent(
    accountID
  )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">From</span>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-bank"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-muted">To</span>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-bank"
        />
      </label>
      <a
        href={href}
        className="rounded-lg bg-bank px-3 py-2 text-center text-xs font-semibold text-white hover:bg-bank-dark"
      >
        Download CSV
      </a>
    </div>
  );
}
