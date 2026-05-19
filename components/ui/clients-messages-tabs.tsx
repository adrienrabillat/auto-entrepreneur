import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Sous-onglets "Liste / Messages" en haut des pages /clients et /messages.
 *
 * Affiché en mobile uniquement (md:hidden) — sur desktop la sidebar a
 * deux entrées distinctes "Messages" et "Clients", donc ce composant
 * ferait doublon.
 *
 * `active` détermine quel onglet apparaît surligné. `unreadCount` permet
 * d'afficher un badge rouge à droite du libellé "Messages" — passé par
 * la page parente qui a accès aux données.
 */
export function ClientsMessagesTabs({
  active,
  unreadCount = 0,
}: {
  active: "list" | "messages";
  unreadCount?: number;
}) {
  return (
    <div
      className="md:hidden -mx-1 mb-1 inline-flex w-full max-w-xs items-center gap-1 rounded-full bg-surface-2 p-1"
      role="tablist"
      aria-label="Clients et messages"
    >
      <TabLink
        href="/clients"
        label="Liste"
        active={active === "list"}
      />
      <TabLink
        href="/messages"
        label="Messages"
        active={active === "messages"}
        badge={unreadCount}
      />
    </div>
  );
}

function TabLink({
  href,
  label,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-small font-medium transition-colors",
        active
          ? "bg-surface text-ink-900 shadow-hair"
          : "text-ink-500 hover:text-ink-700",
      )}
    >
      {label}
      {badge > 0 ? (
        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-danger-500 px-1.5 text-[10px] font-semibold leading-none text-white tabular-nums">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
