import { FormCardSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton page /onboarding — titre centré + carte de formulaire.
 */
export default function OnboardingLoading() {
  return (
    <main className="min-h-dvh flex items-start md:items-center justify-center bg-page py-10 px-4">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-72 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <FormCardSkeleton rows={6} />
      </div>
    </main>
  );
}
