"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/auth-actions";

type State = { error?: string } | undefined;

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<State, FormData>(
    (_prev, fd) => registerAction(_prev, fd),
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
            Create account
          </h1>
          <p className="mt-1 text-sm text-muted">
            Register to apply for a loan.
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
                placeholder="John"
                className="input-field"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Last name</span>
              <input
                type="text"
                name="last_name"
                required
                placeholder="Doe"
                className="input-field"
              />
            </label>
          </div>
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
            <span className="text-sm font-medium text-ink">Phone</span>
            <input
              type="tel"
              name="phone"
              placeholder="+1 555 000 0000"
              className="input-field"
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
              className="input-field"
            />
          </label>

          {state?.error && (
            <p className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn-primary mt-2">
            {pending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-secondary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
