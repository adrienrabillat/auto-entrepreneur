"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { FileText, LayoutDashboard, Receipt, Settings, LogOut, Users } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/invoices", label: "Factures", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/declarations", label: "URSSAF", icon: Receipt },
  { href: "/settings", label: "Profil", icon: Settings },
];

/**
 * Sidebar desktop (≥ md) — design Revolut épuré :
 * identité utilisateur dans une pastille surface-2 douce, navigation
 * en pills qui passent en accent bleu rempli quand actives. Pas de
 * bordure à droite, la séparation se fait par le contraste de fond.
 */
export function Sidebar({ displayName, email }: { displayName: string; email: string }) {
  const pathname = usePathname();
  const initial = (displayName?.[0] ?? "?").toUpperCase();
  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col bg-surface-2 px-4 py-5">
      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-surface shadow-hair p-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-500 text-white font-semibold">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-small font-medium text-ink-900 truncate">{displayName}</div>
          <div className="text-xs text-ink-500 truncate">{email}</div>
        </div>
      </div>

      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-small font-medium transition-all",
                active
                  ? "bg-brand-500 text-white shadow-pop"
                  : "text-ink-700 hover:bg-surface hover:text-ink-900"
              )}
            >
              <Icon size={18} className={active ? "text-white" : "text-ink-500"} />
              {label}
            </Link>
          );
        })}
      </nav>

      <form action="/auth/signout" method="post" className="mt-auto pt-4">
        <button
          type="submit"
          className="flex w-full items-center gap-2 rounded-full px-3.5 py-2 text-small font-medium text-ink-500 hover:bg-surface hover:text-ink-800 transition-colors"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </form>
    </aside>
  );
}

/**
 * Mobile bottom nav — fond surface (blanc/dark), item actif avec pastille
 * bleue remplie type Revolut. Respecte la safe-area iOS.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface shadow-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors",
                  active ? "text-brand-600" : "text-ink-500"
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-12 place-items-center rounded-full transition-all",
                    active ? "bg-brand-500 text-white shadow-pop" : ""
                  )}
                >
                  <Icon size={18} />
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
