"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAdminUrl } from "@/lib/urls";

const links = [
  { href: "/", label: "Overview" },
  { href: "/fund", label: "Fund Account" },
  { href: "/accounts", label: "Beneficiaries" },
  { href: "/transfers", label: "Transfers" },
  { href: "/statements", label: "Statements" },
];

export default function BankNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-bank/20 bg-bank text-white shadow-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <p className="font-display text-xl tracking-tight">Horizon Business Banking</p>
          <p className="text-xs text-white/70">Corporate internet banking</p>
        </div>
        <nav className="flex flex-wrap gap-1">
          {links.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <a
          href={getAdminUrl()}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 ring-1 ring-white/20 hover:bg-white/20"
        >
          Back to PayRecon ↗
        </a>
      </div>
    </header>
  );
}
