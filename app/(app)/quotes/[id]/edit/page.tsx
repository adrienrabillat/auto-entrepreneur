import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { EditQuoteForm } from "./form";

export const dynamic = "force-dynamic";

/**
 * Page d'édition d'un devis existant.
 *
 * Accessible uniquement si le devis n'a PAS été converti en facture.
 * Si le devis est converti, on renvoie 404 (l'UI ne devrait jamais
 * afficher le bouton modifier dans ce cas, mais ceinture + bretelles).
 */
export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, description, quantity, unit_price_cents, amount_cents, operation_type, valid_until, notes, client_name, client_email, converted_invoice_id")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!quote) notFound();
  // Un devis converti en facture est figé — pas d'édition.
  if (quote.converted_invoice_id) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/quotes/${params.id}`}
        className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft size={14} /> Retour au devis
      </Link>
      <h1 className="text-h1 mt-3">
        <span className="text-gradient-brand">Modifier le devis</span>
      </h1>
      <div className="mt-6">
        <EditQuoteForm quote={quote} />
      </div>
    </div>
  );
}
