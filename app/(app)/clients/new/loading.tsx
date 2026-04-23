import {
  BackLinkHeaderSkeleton,
  FormCardSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/**
 * Skeleton page /clients/new — header + carte de formulaire (5-6 inputs).
 */
export default function NewClientLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <BackLinkHeaderSkeleton />
      <FormCardSkeleton rows={6} />
      <div className="flex justify-end">
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
    </div>
  );
}
