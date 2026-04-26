import {
  HeaderSkeleton,
  SegmentedSkeleton,
  ListRowSkeleton,
} from "@/components/ui/skeleton";

export default function QuotesLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <HeaderSkeleton withCta />
      <SegmentedSkeleton count={5} />
      <div className="surface p-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
