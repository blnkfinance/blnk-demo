import type { Metadata } from "next";
import type { ReactNode } from "react";
import BankNav from "@/components/BankNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Horizon Business Banking",
  description: "Demo corporate banking portal for PayRecon payments.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-surface text-ink antialiased">
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at top left, rgba(20,184,166,0.25), transparent 50%), radial-gradient(ellipse at bottom right, rgba(15,118,110,0.18), transparent 45%)",
          }}
        />
        <BankNav />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
