import { FormCardSkeleton, Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton page /settings — header + carte Gmail + carte Apparence +
 * plusieurs cartes de formulaire (Identité, Coordonnées, Bancaires, etc.)
 * avec les icônes rondes colorées.
 */
export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Carte Gmail */}
      <div className="surface p-5 flex items-center gap-4">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-36 rounded-full" />
      </div>

      {/* Carte Apparence */}
      <div className="surface p-5 flex items-center gap-4">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-14 rounded-full" />
      </div>

      {/* Les 6 cartes du formulaire profil */}
      <FormCardSkeleton rows={3} />
      <FormCardSkeleton rows={2} />
      <FormCardSkeleton rows={2} />
    </div>
  );
}
