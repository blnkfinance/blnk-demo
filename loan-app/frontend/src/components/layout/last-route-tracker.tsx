"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { saveLastRoute } from "@/lib/last-route";
import { parseLoanListStatus } from "@/lib/loans/list-route";

export function LastRouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname === "/loans") {
      const status = parseLoanListStatus(searchParams.get("status"));
      saveLastRoute(pathname, status ? `?status=${status}` : "");
      return;
    }

    saveLastRoute(pathname);
  }, [pathname, searchParams]);

  return null;
}
