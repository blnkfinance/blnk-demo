"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  PortalAuthError,
  PortalLoading,
} from "@/components/portal/portal-auth-error";
import {
  applyBrandingPrimaryColor,
  readCachedBrandingPrimaryColor,
} from "@/lib/branding";
import { verifyPortalToken, type PortalAuthResult } from "@/lib/portal-auth";
import { PortalSessionProvider } from "@/lib/portal-session";

type PortalGateProps = {
  children?: React.ReactNode;
  onVerified?: () => void;
};

export function PortalGate({ children, onVerified }: PortalGateProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [result, setResult] = useState<PortalAuthResult | null>(null);

  useLayoutEffect(() => {
    if (!token) {
      return;
    }

    const cached = readCachedBrandingPrimaryColor(token);
    if (cached) {
      applyBrandingPrimaryColor(cached);
    }
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    verifyPortalToken(token).then((auth) => {
      if (!cancelled) {
        if (auth.ok) {
          applyBrandingPrimaryColor(auth.session.brandingPrimaryColor, {
            token,
            installedAppId: auth.session.installed_app_id,
          });
        }
        setResult(auth);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (result?.ok && onVerified) {
      onVerified();
    }
  }, [result, onVerified]);

  if (!result) {
    return <PortalLoading />;
  }

  if (!result.ok) {
    return <PortalAuthError kind={result.kind} message={result.message} />;
  }

  if (onVerified) {
    return <PortalLoading />;
  }

  return (
    <PortalSessionProvider session={result.session} token={token}>
      {children}
    </PortalSessionProvider>
  );
}
