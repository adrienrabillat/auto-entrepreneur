import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/quotes/[id] — modifie certains champs d'un devis.
 *
 * Permis : description, montant, client (réassignation), valid_until,
 * notes, status (transition manuelle accepted/rejected).
 *
 * Refusé : number (séquence figée à la création), user_id (sécurité),
 * id (immutable), converted_invoice_id (set par la route /convert).
 *
 * Statuts : on autorise les transitions
 *   draft → sent (via /send route, pas ici directement)
 *   sent  → accepted | rejected
 *   accepted/rejected → revert vers sent (cas erreur de saisie)
 */
type PatchBody = {
  description?: string;
  amount_cents?: number;
  quantity?: number;
  unit_price_cents?: number | null;
  client_id?: string | null;
  client_email?: string;
  client_name?: string | null;
  client_siren?: string | null;
  client_address?: string | null;
  operation_type?: "service" | "vente" | "mixte";
  valid_until?: string | null;
  notes?: string | null;
  status?: "draft" | "sent" | "accepted" | "rejected" | "expired";
};

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const update: Record<string, unknown> = {};

  if (body.description !== undefined) update.description = body.description.trim();
  if (body.amount_cents !== undefined) {
    const a = Math.floor(Number(body.amount_cents));
    if (!Number.isFinite(a) || a <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    update.amount_cents = a;
  }
  if (body.quantity !== undefined) update.quantity = Number(body.quantity);
  if (body.unit_price_cents !== undefined) update.unit_price_cents = body.unit_price_cents;
  if (body.client_id !== undefined) update.client_id = body.client_id;
  if (body.client_email !== undefined) update.client_email = body.client_email.trim();
  if (body.client_name !== undefined) update.client_name = body.client_name;
  if (body.client_siren !== undefined) update.client_siren = body.client_siren;
  if (body.client_address !== undefined) update.client_address = body.client_address;
  if (body.operation_type !== undefined) update.operation_type = body.operation_type;
  if (body.valid_until !== undefined) update.valid_until = body.valid_until;
  if (body.notes !== undefined) update.notes = body.notes;

  // Transition de statut : on tracke aussi l'horodatage correspondant.
  if (body.status !== undefined) {
    update.status = body.status;
    if (body.status === "accepted") update.accepted_at = new Date().toISOString();
    if (body.status === "rejected") update.rejected_at = new Date().toISOString();
    // Reverting vers 'sent' depuis accepted/rejected → on remet les
    // horodatages à null pour cohérence (l'user a probablement cliqué
    // par erreur).
    if (body.status === "sent") {
      update.accepted_at = null;
      update.rejected_at = null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  const { error } = await supabase
    .from("quotes")
    .update(update)
    .eq("id", ctx.params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/quotes/[id] — supprime un devis.
 *
 * Contrairement aux factures (où on n'autorise la suppression que des
 * brouillons pour respecter la contrainte légale de séquence continue),
 * les devis n'ont pas de contrainte de séquence — on autorise donc la
 * suppression de tous les statuts SAUF 'accepted' avec converted_invoice_id
 * (cas où une facture a déjà été générée à partir du devis : supprimer
 * casserait le lien historique).
 */
export async function DELETE(_req: NextRequest, ctx: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Pré-check : récupérer le devis pour vérifier qu'il n'a pas été converti.
  const { data: quote } = await supabase
    .from("quotes")
    .select("converted_invoice_id")
    .eq("id", ctx.params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!quote) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }
  if (quote.converted_invoice_id) {
    return NextResponse.json(
      { error: "Ce devis a déjà été converti en facture, impossible de le supprimer." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", ctx.params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
