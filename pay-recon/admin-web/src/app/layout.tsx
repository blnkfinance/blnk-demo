import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayRecon Admin",
  description: "Accountant dashboard for bill payment and reconciliation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const jar = await cookies();
  const isAuthenticated = !!jar.get("admin_auth_token")?.value;

  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-surface text-ink antialiased">
        {isAuthenticated ? (
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-surface p-8">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
