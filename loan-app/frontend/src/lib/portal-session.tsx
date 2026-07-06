"use client";

import { createContext, useContext, useLayoutEffect } from "react";
import { applyBrandingPrimaryColor } from "@/lib/branding";
import type { PortalSession } from "@/lib/portal-auth";

const PortalSessionContext = createContext<PortalSession | null>(null);

type PortalSessionProviderProps = {
  session: PortalSession;
  token: string | null;
  children: React.ReactNode;
};

export function PortalSessionProvider({
  session,
  token,
  children,
}: PortalSessionProviderProps) {
  useLayoutEffect(() => {
    applyBrandingPrimaryColor(session.brandingPrimaryColor, {
      token,
      installedAppId: session.installed_app_id,
    });
  }, [session.brandingPrimaryColor, session.installed_app_id, token]);

  return (
    <PortalSessionContext.Provider value={session}>
      {children}
    </PortalSessionContext.Provider>
  );
}

export function usePortalSession(): PortalSession {
  const session = useContext(PortalSessionContext);
  if (!session) {
    throw new Error("usePortalSession must be used within PortalGate");
  }
  return session;
}
