import {
  BackLinkHeaderSkeleton,
  FormCardSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/**
 * Skeleton page /clients/[id] — identique à /clients/new (même formulaire
 * pré-rempli en mode édition).
 */
export default function EditClientLoading() {
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
