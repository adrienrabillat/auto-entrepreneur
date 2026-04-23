"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { FileText, LayoutDashboard, Receipt, Settings, LogOut, Sparkles } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/invoices", label: "Factures", icon: FileText },
  { href: "/declarations", label: "URSSAF", icon: Receipt },
  { href: "/settings", label: "Profil", icon: Settings },
];

/**
 * Desktop sidebar (≥ md). Uses a soft gradient header, pill-shaped active
 * nav states with brand gradient, and a clear sign-out at the bottom.
 */
export function Sidebar({ displayName, email }: { displayName: string; email: string }) {
  const pathname = usePathname();
  const initial = (displayName?.[0] ?? "?").toUpperCase();
  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-ink-200 bg-white/80 backdrop-blur px-4 py-5">
      <div className="flex items-center gap-2 px-1 pb-5">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-white shadow-pop">
          <Sparkles size={16} />
        </div>
        <div className="text-h3 font-bold tracking-tight text-ink-900">AutoEntre</div>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-brand-gradient-subtle p-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-white font-bold">
          {initial}
        </div>
        <div className="min-w-0">
          <div className="text-small font-semibold text-ink-900 truncate">{displayName}</div>
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
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-small font-semibold transition-colors",
                active
                  ? "bg-brand-gradient text-white shadow-pop"
                  : "text-ink-700 hover:bg-ink-100"
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
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-small font-medium text-ink-500 hover:bg-ink-100 hover:text-ink-800"
        >
          <LogOut size={16} />
          Se déconnecter
        </button>
      </form>
    </aside>
  );
}

/**
 * Mobile header (sticky top). Brand + user initial only — real navigation
 * is the bottom-nav below.
 */
export function MobileHeader({ displayName }: { displayName: string }) {
  const initial = (displayName?.[0] ?? "?").toUpperCase();
  return (
    <header className="md:hidden sticky top-0 z-20 border-b border-ink-200 bg-white/80 backdrop-blur px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-xl bg-brand-gradient text-white shadow-pop">
          <Sparkles size={14} />
        </div>
        <div className="text-h3 font-bold tracking-tight text-ink-900">AutoEntre</div>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          aria-label="Se déconnecter"
          className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient-subtle text-brand-700 font-bold"
        >
          {initial}
        </button>
      </form>
    </header>
  );
}

/**
 * Mobile bottom navigation (≤ md). Large touch targets with brand highlight
 * on the active tab. Respects iOS safe-area inset.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-ink-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium",
                  active ? "text-brand-600" : "text-ink-500"
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-12 place-items-center rounded-full transition-all",
                    active ? "bg-brand-gradient text-white shadow-pop" : ""
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
