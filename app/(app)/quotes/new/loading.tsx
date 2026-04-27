import {
  BackLinkHeaderSkeleton,
  StepperSkeleton,
  FormCardSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/**
 * Skeleton page /quotes/new — wizard 3 étapes (Client / Prestation / Relecture).
 * Calque /invoices/new/loading.tsx pour cohérence visuelle entre les deux flows.
 * Sans ce fichier, l'écran figeait pendant le SSR de la page (~500-1000 ms,
 * variable selon le nombre de clients à charger côté serveur).
 */
export default function NewQuoteLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <BackLinkHeaderSkeleton />
      <StepperSkeleton />
      <FormCardSkeleton rows={4} />
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-32 rounded-full" />
      </div>
    </div>
  );
}
