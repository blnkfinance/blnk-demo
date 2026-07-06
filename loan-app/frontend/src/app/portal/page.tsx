"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PortalGate } from "@/components/portal/portal-gate";
import { PortalLoading } from "@/components/portal/portal-auth-error";
import { getLastRoute } from "@/lib/last-route";
import { withToken } from "@/lib/portal-token";

function PortalEntryInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const onVerified = useCallback(() => {
    router.replace(withToken(getLastRoute(), token));
  }, [router, token]);

  return <PortalGate onVerified={onVerified} />;
}

export default function PortalPage() {
  return (
    <Suspense fallback={<PortalLoading />}>
      <PortalEntryInner />
    </Suspense>
  );
}
