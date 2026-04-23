import { HeaderSkeleton, ListRowSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";

/**
 * Shared loading skeleton for every page in the authenticated app group.
 * Next.js renders this immediately on client-side navigation while the
 * destination server component streams in, so the user always gets visual
 * feedback instead of staring at a frozen screen.
 */
export default function AppLoading() {
  return (
    <div className="space-y-8">
      <HeaderSkeleton />
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="surface overflow-hidden">
        <ListRowSkeleton />
        <ListRowSkeleton />
        <ListRowSkeleton />
        <ListRowSkeleton />
      </div>
    </div>
  );
}
