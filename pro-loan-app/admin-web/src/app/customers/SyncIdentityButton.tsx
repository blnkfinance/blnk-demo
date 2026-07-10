"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncIdentityAction } from "@/lib/customer-actions";

export default function SyncIdentityButton({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    setLoading(true);
    try {
      const result = await syncIdentityAction(customerId);
      if (result && "error" in result) {
        setError(result.error ?? "Sync failed");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50 transition-colors"
      >
        {loading ? "Syncing…" : "Sync identity"}
      </button>
      {error && <span className="text-xs text-error">{error}</span>}
    </div>
  );
}
