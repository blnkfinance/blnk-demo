"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { inviteAdminAction } from "@/lib/admin-actions";

export default function InviteAdminForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [state, dispatch, pending] = useActionState(inviteAdminAction, null);

  useEffect(() => {
    if (state && typeof state === "object" && "success" in state) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  const error =
    state && typeof state === "object" && "error" in state
      ? (state as { error: string }).error
      : null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
      >
        + Invite admin
      </button>
    );
  }

  return (
    <div className="rounded-2xl bg-surface-elevated p-6 shadow-sm ring-1 ring-border">
      <h2 className="mb-4 font-semibold text-ink">Invite admin</h2>
      <form action={dispatch} className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">First name</span>
          <input
            name="first_name"
            required
            placeholder="Jane"
            className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Last name</span>
          <input
            name="last_name"
            required
            placeholder="Doe"
            className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            placeholder="admin@example.com"
            className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs font-medium text-muted">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Min. 8 characters"
            className="rounded-lg border border-border px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>

        {error && (
          <p className="col-span-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error ring-1 ring-error/30">
            {error}
          </p>
        )}

        <div className="col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
          >
            {pending ? "Creating…" : "Create admin"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-border/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
