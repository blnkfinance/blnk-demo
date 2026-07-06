import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { AppProviders } from "@/components/providers/app-providers";
import {
  BRANDING_BOOTSTRAP_SCRIPT,
  BRANDING_COOKIE_NAME,
  readBrandingPrimaryColorForRequest,
} from "@/lib/branding";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loan management",
  description: "Omni Cloud loan custom app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const brandingColor = readBrandingPrimaryColorForRequest(
    cookieStore.get(BRANDING_COOKIE_NAME)?.value
  );

  return (
    <html
      lang="en"
      className="h-full"
      style={
        {
          "--platform-brand-primary": brandingColor,
        } as CSSProperties
      }
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: BRANDING_BOOTSTRAP_SCRIPT }}
        />
      </head>
      <body className="h-full overflow-hidden">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
