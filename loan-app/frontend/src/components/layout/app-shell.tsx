import { Suspense } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppNav } from "@/components/layout/app-nav";
import { AppNotice } from "@/components/layout/app-notice";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-platform-nav-bg">
      <AppHeader fixed />
      <AppHeader />

      <div className="mt-4 flex flex-col gap-4">
        <AppNotice />

        <Suspense
          fallback={
            <div>
              <div className="mx-auto h-8 max-w-6xl px-4 sm:px-6" />
              <div className="h-px w-full bg-platform-stroke" />
            </div>
          }
        >
          <AppNav />
        </Suspense>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 pb-6 sm:px-6">
        <main
          data-main-scroll
          className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
