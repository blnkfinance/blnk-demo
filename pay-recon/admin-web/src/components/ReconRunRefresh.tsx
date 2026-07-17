"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Polls the page while a reconciliation run is still pending. */
export default function ReconRunRefresh({ status }: { status: string }) {
  const router = useRouter();

  useEffect(() => {
    if (status !== "pending") return;
    const id = window.setInterval(() => {
      router.refresh();
    }, 1500);
    return () => window.clearInterval(id);
  }, [status, router]);

  return null;
}
