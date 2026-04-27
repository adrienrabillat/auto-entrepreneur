import { Skeleton, BackLinkHeaderSkeleton } from "@/components/ui/skeleton";

/**
 * Skeleton page détail devis — back link + hero montant XL + grille d'infos
 * + placeholder PDF. Calque /invoices/[id]/loading.tsx pour cohérence visuelle
 * entre les deux flows. Évite le flash entre le layout générique et le layout
 * spécifique de /quotes/[id] qui charge un PDF en iframe.
 */
export default function QuoteDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      <BackLinkHeaderSkeleton />

      {/* Hero montant */}
      <div className="surface p-7 md:p-9">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-12 md:h-14 w-56" />
        <Skeleton className="mt-3 h-3 w-52" />
      </div>

      {/* Champs du devis */}
      <div className="surface p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-11 w-40 rounded-full" />
          <Skeleton className="h-11 w-44 rounded-full" />
        </div>
      </div>

      {/* Aperçu PDF */}
      <div className="surface overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-full h-[600px] rounded-none" />
      </div>
    </div>
  );
}
