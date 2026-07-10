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
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">
            Admin Portal
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Create admin account
          </h1>
          <p className="mt-1 text-sm text-muted">
            Set up the first admin account for this platform. This page is only
            available before any admin exists.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">First name</span>
              <input
                type="text"
                name="first_name"
                required
                placeholder="Jane"
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Last name</span>
              <input
                type="text"
                name="last_name"
                required
                placeholder="Doe"
                className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@example.com"
              className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
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
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {pending ? "Creating account…" : "Create admin account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </Link>
        </p>

        <div className="mt-4 rounded-lg bg-warning/10 px-3 py-2 ring-1 ring-warning/30">
          <p className="text-xs text-warning">
            This endpoint is disabled once an admin account exists.
            Use the dashboard to invite additional admins.
          </p>
        </div>
      </div>
    </div>
  );
}
