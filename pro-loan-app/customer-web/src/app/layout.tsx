import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { logoutAction } from "@/lib/auth-actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProBank",
  description: "Banking made simple — send money, track loans, and more.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const jar = await cookies();
  const isAuthenticated = !!jar.get("customer_auth_token")?.value;

  return (
    <html lang="en">
      <body>
        {isAuthenticated ? (
          <div className="min-h-screen flex flex-col">
            <header className="sticky top-0 z-10 border-b border-border bg-surface-elevated/90 backdrop-blur-xl px-6 py-4">
              <div className="mx-auto max-w-4xl flex items-center justify-between">
                <Link
                  href="/"
                  className="text-sm font-bold tracking-tight text-brand"
                >
                  Pro<span className="text-secondary">Bank</span>
                </Link>
                <nav className="flex items-center gap-1 sm:gap-2">
                  <Link
                    href="/"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-ink transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/send"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-ink transition-colors"
                  >
                    Send
                  </Link>
                  <Link
                    href="/loans"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface hover:text-ink transition-colors"
                  >
                    Loans
                  </Link>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-ink transition-colors"
                    >
                      Sign out
                    </button>
                  </form>
                </nav>
              </div>
            </header>
            <main className="flex-1 mx-auto w-full max-w-4xl px-6 py-8">
              {children}
            </main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
