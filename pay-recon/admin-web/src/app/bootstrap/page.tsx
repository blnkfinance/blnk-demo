"use client";

import { useActionState } from "react";
import Link from "next/link";
import { bootstrapAction } from "@/lib/auth-actions";

type State = { error?: string } | undefined;

export default function BootstrapPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    (_prev, fd) => bootstrapAction(_prev, fd),
    undefined
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface-elevated p-8 shadow-sm ring-1 ring-border">
        <h1 className="text-2xl font-semibold text-ink">Create accountant account</h1>
        <p className="mt-1 text-sm text-muted">Available only when no admins exist.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <input name="first_name" required placeholder="First name" className="rounded-lg border border-border px-3 py-2 text-sm" />
          <input name="last_name" required placeholder="Last name" className="rounded-lg border border-border px-3 py-2 text-sm" />
          <input type="email" name="email" required placeholder="Email" className="rounded-lg border border-border px-3 py-2 text-sm" />
          <input type="password" name="password" required placeholder="Password" className="rounded-lg border border-border px-3 py-2 text-sm" />

          {state?.error && (
            <p className="text-sm text-error">{state.error}</p>
          )}

          <button type="submit" disabled={pending} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white">
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-brand hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
