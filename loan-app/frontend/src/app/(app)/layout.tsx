import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { LastRouteTracker } from "@/components/layout/last-route-tracker";
import { ViewportGate } from "@/components/layout/viewport-gate";
import { PortalGate } from "@/components/portal/portal-gate";
import { PortalLoading } from "@/components/portal/portal-auth-error";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewportGate>
      <Suspense fallback={<PortalLoading />}>
        <PortalGate>
          <LastRouteTracker />
          <AppShell>{children}</AppShell>
        </PortalGate>
      </Suspense>
    </ViewportGate>
  );
}
