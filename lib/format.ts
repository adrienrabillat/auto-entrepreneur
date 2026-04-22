export function formatEUR(cents: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function monthLabel(year: number, month: number) {
  const d = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(d);
}
