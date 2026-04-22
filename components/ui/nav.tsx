"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { FileText, LayoutDashboard, Receipt, Settings } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/invoices", label: "Factures", icon: FileText },
  { href: "/declarations", label: "URSSAF", icon: Receipt },
  { href: "/settings", label: "Profil", icon: Settings },
];

export function Sidebar({ displayName, email }: { displayName: string; email: string }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 shrink-0 flex-col border-r border-ink-200 bg-ink-50 px-3 py-4">
      <div className="px-2 pb-3">
        <div className="text-small font-semibold text-ink-800 truncate">{displayName}</div>
        <div className="text-xs text-ink-500 truncate">{email}</div>
      </div>
      <nav className="mt-2 space-y-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-small",
                active ? "bg-ink-200/70 text-ink-900" : "text-ink-700 hover:bg-ink-200/50"
              )}
            >
              <Icon size={16} className="text-ink-500" />
              {label}
            </Link>
          );
        })}
      </nav>
      <form action="/auth/signout" method="post" className="mt-auto px-2 pt-4">
        <button type="submit" className="text-xs text-ink-500 hover:text-ink-800">
          Se déconnecter
        </button>
      </form>
    </aside>
  );
}

export function MobileHeader({ displayName }: { displayName: string }) {
  const pathname = usePathname();
  return (
    <header className="md:hidden sticky top-0 z-10 border-b border-ink-200 bg-ink-50/90 backdrop-blur px-4 py-3 flex items-center justify-between">
      <div className="text-small font-semibold">{displayName}</div>
      <nav className="flex items-center gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn("p-2 rounded-md", active ? "bg-ink-200" : "hover:bg-ink-100")}
            >
              <Icon size={16} />
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
