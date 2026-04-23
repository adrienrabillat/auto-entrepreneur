import {
  HeaderSkeleton,
  SegmentedSkeleton,
  ListRowSkeleton,
} from "@/components/ui/skeleton";

/**
 * Skeleton page /invoices — mime le layout réel : header + filtre segmenté
 * + liste des factures en rangées avec avatars. Cascade vers app/(app)/loading
 * supprimée au profit de ce layout-ci quand on navigue vers /invoices.
 */
export default function InvoicesLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <HeaderSkeleton withCta />
      <SegmentedSkeleton count={4} />
      <div className="surface p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
