import {
  BackLinkHeaderSkeleton,
  StepperSkeleton,
  FormCardSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

/**
 * Skeleton page /invoices/new — wizard 3 étapes. On montre le stepper et
 * la carte de l'étape courante (par défaut : étape 1 = sélection client).
 */
export default function NewInvoiceLoading() {
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
