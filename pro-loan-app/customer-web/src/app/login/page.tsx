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
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm card p-8">
        <div className="mb-8 text-center">
          <p className="text-lg font-bold text-brand">
            Pro<span className="text-secondary">Bank</span>
          </p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-muted">
            Sign in to manage your money and loans.
          </p>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Email</span>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="input-field"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Password</span>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="input-field"
            />
          </label>

          {state?.error && (
            <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary mt-2">
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          New customer?{" "}
          <Link href="/register" className="font-medium text-secondary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
