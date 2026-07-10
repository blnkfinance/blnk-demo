"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/auth-actions";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/treasury", label: "Treasury" },
  { href: "/loans", label: "Loans" },
  { href: "/customers", label: "Customers" },
  { href: "/products", label: "Products" },
  { href: "/admins", label: "Admins" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col bg-brand px-4 py-6 text-white">
      <div className="mb-8 px-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/90">
          Pro Loan
        </p>
        <p className="mt-0.5 text-xs text-white/60">Admin dashboard</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map(({ href, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-light text-white"
                  : "text-white/80 hover:bg-brand-dark hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-white/60 hover:bg-brand-dark hover:text-white transition-colors"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
