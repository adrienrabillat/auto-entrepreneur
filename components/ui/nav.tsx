"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  FileText,
  FilePen,
  LayoutDashboard,
  MessageSquare,
  MoreHorizontal,
  Receipt,
  Settings,
  Users,
} from "lucide-react";

// Items de navigation desktop (sidebar) — on garde les 7 entrées : la
// sidebar a la place de tout afficher et chaque entrée pointe vers une
// destination directe sans regroupement.
// Ordre : Accueil → Devis → Factures → Messages → Clients → URSSAF → Profil.
const items = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/quotes", label: "Devis", icon: FilePen },
  { href: "/invoices", label: "Factures", icon: FileText },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/declarations", label: "URSSAF", icon: Receipt },
  { href: "/settings", label: "Profil", icon: Settings },
];

// Bottom-nav mobile — on plafonne à 5 onglets (recommandation Apple HIG /
// Material). Regroupements vs. desktop :
//  • Clients englobe /messages (un message est toujours rattaché à un
//    client, sous-onglet Liste/Messages géré sur la page).
//  • Plus regroupe URSSAF et Profil (consultés moins fréquemment), pointe
//    sur /more qui présente une grille.
// On surligne "Clients" si pathname commence par /clients OU /messages,
// idem "Plus" si pathname commence par /more, /declarations ou /settings.
type MobileItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  /** Préfixes de routes qui activent visuellement cet onglet. Si absent,
   *  on retombe sur le href. */
  activePrefixes?: string[];
};

const mobileItems: MobileItem[] = [
  { href: "/dashboard", label: "Accueil", icon: LayoutDashboard },
  { href: "/quotes", label: "Devis", icon: FilePen },
  { href: "/invoices", label: "Factures", icon: FileText },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    activePrefixes: ["/clients", "/messages"],
  },
  {
    href: "/more",
    label: "Plus",
    icon: MoreHorizontal,
    activePrefixes: ["/more", "/declarations", "/settings"],
  },
];

function isActive(pathname: string, item: { href: string; activePrefixes?: string[] }) {
  const prefixes = item.activePrefixes ?? [item.href];
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

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

      {/* Lien URSSAF + lien légal en pied de sidebar — discret. */}
      <div className="mt-auto pt-6 space-y-2.5">
        <a
          href="https://www.autoentrepreneur.urssaf.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[11px] leading-snug text-ink-400 hover:text-ink-600 transition-colors px-3.5"
        >
          L&apos;essentiel du statut —{" "}
          <span className="underline underline-offset-2">Autoentrepreneur.urssaf.fr</span>
        </a>
        {/* Lien légal — Sprint 5 #13. Pas dans la nav principale parce que
            ce n'est pas une fonctionnalité métier, mais reste accessible. */}
        <Link
          href="/legal"
          className="block text-[11px] leading-snug text-ink-400 hover:text-ink-600 transition-colors px-3.5"
        >
          Mentions légales · CGU · Confidentialité
        </Link>
      </div>
    </aside>
  );
}

/**
 * Mobile bottom nav — fond surface (blanc/dark), item actif avec pastille
 * bleue remplie type Revolut. Respecte la safe-area iOS.
 *
 * 5 onglets max (Apple HIG / Material). Clients et Plus regroupent
 * plusieurs routes — voir `mobileItems` ci-dessus pour le mapping.
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface shadow-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {mobileItems.map((item) => {
          const { href, label, icon: Icon } = item;
          const active = isActive(pathname, item);
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
