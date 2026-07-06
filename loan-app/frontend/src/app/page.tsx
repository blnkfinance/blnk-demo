"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PortalLoading } from "@/components/portal/portal-auth-error";
import { getLastRoute } from "@/lib/last-route";
import { withToken } from "@/lib/portal-token";

function HomeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    router.replace(withToken(getLastRoute(), token));
  }, [router, token]);

  return <PortalLoading />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<PortalLoading />}>
      <HomeRedirect />
    </Suspense>
  );
}
