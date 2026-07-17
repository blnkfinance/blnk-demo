"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/lib/auth-actions";

type State = { error?: string } | undefined;

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    (_prev, fd) => loginAction(_prev, fd),
    undefined
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface-elevated p-8 shadow-sm ring-1 ring-border">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            PayRecon
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-muted">
            Accountant access to bills, reconciliation, and remittances.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="accountant@example.com"
              className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </label>

          {state?.error && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          No account yet?{" "}
          <Link href="/bootstrap" className="font-medium text-brand hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
