"use client";

import Link from "next/link";
import { LayoutGroup, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { withToken } from "@/lib/portal-token";

const navItems = [
  { label: "Loans", href: "/loans" },
  { label: "Products", href: "/products" },
  { label: "Settings", href: "/settings" },
] as const;

function isNavItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return (
    <nav>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LayoutGroup id="app-nav">
          <ul className="flex h-8 items-end gap-2">
            {navItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={withToken(item.href, token)}
                    className={cn(
                      "relative inline-block p-2 text-sm font-medium leading-4 transition-colors duration-[250ms]",
                      isActive
                        ? "font-semibold text-platform-nav-text-selected"
                        : "text-platform-muted"
                    )}
                  >
                    {item.label}
                    {isActive ? (
                      <motion.span
                        layoutId="app-nav-underline"
                        className="absolute inset-x-0 -bottom-px h-px bg-platform-nav-text-selected"
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </LayoutGroup>
      </div>
      <div className="h-px w-full bg-platform-stroke" />
    </nav>
  );
}
