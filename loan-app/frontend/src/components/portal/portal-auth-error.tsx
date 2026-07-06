import { AppShell } from "@/components/layout/app-shell";
import { LoansPageSkeleton } from "@/components/loans/loans-page-skeleton";

type PortalAuthErrorProps = {
  kind: "auth" | "connectivity";
  message: string;
};

export function PortalAuthError({ kind, message }: PortalAuthErrorProps) {
  const title =
    kind === "connectivity" ? "Connection problem" : "Session unavailable";

  return (
    <div className="flex min-h-screen items-center justify-center bg-platform-main-bg px-4">
      <div className="max-w-md space-y-2 text-center">
        <h1 className="font-pastiche text-xl font-medium text-platform-primary-text">
          {title}
        </h1>
        <p className="text-sm text-platform-muted">{message}</p>
      </div>
    </div>
  );
}

export function PortalLoading() {
  return (
    <AppShell>
      <LoansPageSkeleton />
    </AppShell>
  );
}
