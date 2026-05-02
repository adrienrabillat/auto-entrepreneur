import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInvoicePdf, type InvoicePdfData, type OperationType } from "@/lib/pdf";
import { deliverInvoice } from "@/lib/delivery";
import { nextQuoteNumber } from "@/lib/invoice-number";
import { loadProfile, createInvoiceRow } from "@/lib/invoice-service";
import { formatEUR } from "@/lib/format";

/**
 * Représentation d'une ligne brute de la table `quotes`. Schéma identique
 * à `invoices` modulo les statuts spécifiques (accepted/rejected/expired)
 * et les colonnes propres aux devis (valid_until, accepted_at, etc.).
 */
export type QuoteRow = {
  id: string;
  user_id: string;
  number: string;
  issued_on: string;
  valid_until: string | null;
  description: string;
  quantity: number | string;
  unit_price_cents: number | null;
  amount_cents: number;
  currency: string;
  operation_type: OperationType;
  client_id: string | null;
  client_email: string;
  client_name: string | null;
  client_siren: string | null;
  client_address: string | null;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  sent_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  converted_invoice_id: string | null;
  notes: string | null;
};

/**
 * Insère un devis avec numérotation atomique (retry sur unique violation).
 * Calque le pattern de createInvoiceRow.
 */
export async function createQuoteRow(
  supabase: SupabaseClient,
  userId: string,
  input: {
    description: string;
    amount_cents: number;
    quantity?: number;
    unit_price_cents?: number | null;
    client_email: string;
    client_name?: string | null;
    client_siren?: string | null;
    client_address?: string | null;
    client_id?: string | null;
    operation_type?: OperationType;
    valid_until?: string | null;
    notes?: string | null;
  },
): Promise<QuoteRow> {
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const unit_price_cents =
    input.unit_price_cents ?? Math.round(input.amount_cents / quantity);

  // Date de validité par défaut : aujourd'hui + 30 jours. C'est l'usage
  // standard pour un devis BtoB et BtoC en France.
  const defaultValidUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })();

  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const number = await nextQuoteNumber(supabase, userId);
    const { data, error } = await supabase
      .from("quotes")
      .insert({
        user_id: userId,
        number,
        description: input.description,
        quantity,
        unit_price_cents,
        amount_cents: input.amount_cents,
        client_id: input.client_id ?? null,
        client_email: input.client_email,
        client_name: input.client_name ?? null,
        client_siren: input.client_siren ?? null,
        client_address: input.client_address ?? null,
        operation_type: input.operation_type ?? "service",
        valid_until: input.valid_until ?? defaultValidUntil,
        notes: input.notes ?? null,
        status: "draft",
      })
      .select("*")
      .single();

    if (!error) return data as QuoteRow;

    // Comme pour les factures, on retente uniquement sur conflit du numéro.
    const isNumberClash =
      (error as { code?: string })?.code === "23505" &&
      /quotes_user_id_number_key|\(number\)|\bnumber\b/i.test(error.message || "");
    if (isNumberClash && attempt < MAX_ATTEMPTS) continue;
    throw error;
  }
  throw new Error(
    `Impossible d'attribuer un numéro de devis unique après ${MAX_ATTEMPTS} tentatives.`,
  );
}

/**
 * Génère le PDF d'un devis. Réutilise generateInvoicePdf avec le flag
 * documentKind: 'quote' pour avoir un titre "DEVIS" et la date d'échéance
 * libellée comme validité.
 */
export async function generateQuotePdfBytes(
  supabase: SupabaseClient,
  userId: string,
  quoteId: string,
): Promise<{ bytes: Uint8Array; quote: QuoteRow; filename: string }> {
  const profile = await loadProfile(supabase, userId);
  const { data: rawQuote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  const quote = rawQuote as QuoteRow;

  const qty = Number(quote.quantity) || 1;
  const unit = quote.unit_price_cents ?? Math.round(quote.amount_cents / qty);

  const data: InvoicePdfData = {
    documentKind: "quote",
    number: quote.number,
    issuedOn: quote.issued_on,
    // Sur un devis on réutilise dueOn comme "Validité jusqu'au …" — le
    // PDF générique l'affichera comme date d'échéance, ce qui pour un
    // devis se lit "valable jusqu'au".
    dueOn: quote.valid_until ?? undefined,
    description: quote.description,
    quantity: qty,
    unitPriceCents: unit,
    amountCents: quote.amount_cents,
    currency: quote.currency || "EUR",
    operationType: quote.operation_type,
    paymentTerms: undefined,
    discountTerms: "Néant",
    seller: {
      displayName: profile.display_name!,
      businessName: profile.business_name ?? undefined,
      legalForm: profile.legal_form,
      metier: profile.metier!,
      siren: profile.siren!,
      siret: profile.siret!,
      apeNaf: profile.ape_naf ?? undefined,
      addressLine1: profile.address_line1!,
      addressLine2: profile.address_line2 ?? undefined,
      postalCode: profile.postal_code!,
      city: profile.city!,
      country: profile.country || "France",
      phone: profile.phone ?? undefined,
      website: profile.website ?? undefined,
      email: profile.gmail_connected_email ?? profile.email,
      iban: profile.iban!,
      bic: profile.bic!,
      rcsNumber: profile.rcs_number ?? undefined,
      rcsCity: profile.rcs_city ?? undefined,
      rmNumber: profile.rm_number ?? undefined,
      rmDepartment: profile.rm_department ?? undefined,
      insuranceName: profile.insurance_name ?? undefined,
      insuranceCoverage: profile.insurance_coverage ?? undefined,
      mediatorName: profile.mediator_name ?? undefined,
      mediatorWebsite: profile.mediator_website ?? undefined,
    },
    client: {
      name: quote.client_name ?? undefined,
      email: quote.client_email,
      siren: quote.client_siren ?? undefined,
      address: quote.client_address ?? undefined,
    },
  };

  const bytes = await generateInvoicePdf(data);
  return { bytes, quote, filename: `devis-${quote.number}.pdf` };
}

/**
 * Envoie un devis par email (Gmail aujourd'hui). Génère le PDF, l'upload
 * dans le bucket "invoices" (réutilisé pour devis — dossier dédié), et
 * envoie l'email via le dispatcher delivery existant. Met à jour le statut
 * du devis (draft → sent + sent_at).
 */
export async function sendQuote(
  supabase: SupabaseClient,
  userId: string,
  quoteId: string,
) {
  const { bytes, quote, filename } = await generateQuotePdfBytes(supabase, userId, quoteId);
  const profile = await loadProfile(supabase, userId);

  const storagePath = `${userId}/quotes/${quote.id}/${filename}`;
  const { error: upErr } = await supabase.storage
    .from("invoices")
    .upload(storagePath, bytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;

  const prettyAmount = formatEUR(quote.amount_cents);
  const subject = `Devis ${quote.number} — ${profile.display_name}`;
  const text = [
    `Bonjour${quote.client_name ? " " + quote.client_name : ""},`,
    ``,
    `Vous trouverez en pièce jointe le devis ${quote.number} d'un montant de ${prettyAmount}.`,
    ``,
    `Objet : ${quote.description}`,
    quote.valid_until ? `\nValable jusqu'au ${formatFr(quote.valid_until)}.` : "",
    ``,
    `Pour accepter ce devis, répondez simplement à cet email avec la mention "Bon pour accord".`,
    ``,
    `Bien cordialement,`,
    profile.display_name,
    profile.metier ?? "",
  ].filter(Boolean).join("\n");

  // Version HTML simple pour les clients qui préfèrent le rendu riche.
  const html = `<p>Bonjour${quote.client_name ? " " + escapeHtml(quote.client_name) : ""},</p>
<p>Vous trouverez en pièce jointe le devis <strong>${escapeHtml(quote.number)}</strong> d'un montant de <strong>${prettyAmount}</strong>.</p>
<p><em>Objet :</em> ${escapeHtml(quote.description)}</p>
${quote.valid_until ? `<p>Valable jusqu'au <strong>${formatFr(quote.valid_until)}</strong>.</p>` : ""}
<p>Pour accepter ce devis, répondez à cet email avec la mention « Bon pour accord ».</p>
<p>Bien cordialement,<br>${escapeHtml(profile.display_name ?? "")}<br>${escapeHtml(profile.metier ?? "")}</p>`;

  // Pour le devis on FORCE le canal Gmail : la PDP ne traite que les
  // factures B2B au sens e-invoicing, pas les devis.
  await deliverInvoice(
    {
      recipient: {
        siren: quote.client_siren,
        countryCode: "FR",
        email: quote.client_email,
        name: quote.client_name,
      },
      invoice: {
        id: quote.id,
        number: quote.number,
        description: quote.description,
        amount_cents: quote.amount_cents,
        prepaid: false,
      },
      pdf: { bytes, filename },
      email: { subject, text, html, bccSelf: true },
      sender: {
        displayName: profile.display_name ?? "",
        email: profile.email,
        gmailRefreshToken: profile.gmail_refresh_token,
        gmailConnectedEmail: profile.gmail_connected_email,
      },
    },
    { forceChannel: "gmail" },
  );

  // Mise à jour du statut. On ne change pas si déjà 'accepted' ou 'rejected'
  // (l'user pourrait re-renvoyer un devis déjà accepté pour archivage).
  if (quote.status === "draft") {
    await supabase
      .from("quotes")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", quote.id)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("quotes")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", quote.id)
      .eq("user_id", userId);
  }
}

/**
 * Convertit un devis accepté en facture. Crée une nouvelle ligne dans
 * `invoices` (avec son propre numéro de facture pris dans la séquence
 * factures), puis lie le devis via `converted_invoice_id`.
 *
 * Garde-fou : si le devis a déjà été converti, on renvoie l'ID de la
 * facture existante au lieu d'en créer une nouvelle (idempotence du POST
 * /api/quotes/[id]/convert).
 */
export async function convertQuoteToInvoice(
  supabase: SupabaseClient,
  userId: string,
  quoteId: string,
): Promise<{ invoiceId: string; alreadyConverted: boolean }> {
  const { data: rawQuote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  const quote = rawQuote as QuoteRow;

  // Idempotence : si déjà converti ET que la facture existe encore, on ne
  // recrée pas. C'est important pour les double-clics et pour les retries
  // éventuels côté client.
  // MAIS si la facture liée a été supprimée (brouillon supprimé par l'user),
  // on permet une reconversion en nettoyant l'ancien lien.
  if (quote.converted_invoice_id) {
    const { data: linkedInvoice } = await supabase
      .from("invoices")
      .select("id")
      .eq("id", quote.converted_invoice_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (linkedInvoice) {
      // La facture existe toujours → idempotent, on renvoie l'ID existant.
      return { invoiceId: quote.converted_invoice_id, alreadyConverted: true };
    }
    // La facture a été supprimée → on nettoie le lien pour pouvoir reconvertir.
    await supabase
      .from("quotes")
      .update({ converted_invoice_id: null })
      .eq("id", quote.id)
      .eq("user_id", userId);
  }

  // Crée la facture avec les mêmes données. Le numéro de facture est
  // attribué par createInvoiceRow (séquence indépendante des devis).
  const invoice = await createInvoiceRow(supabase, userId, {
    description: quote.description,
    amount_cents: quote.amount_cents,
    quantity: Number(quote.quantity) || 1,
    unit_price_cents: quote.unit_price_cents,
    client_email: quote.client_email,
    client_name: quote.client_name,
    client_siren: quote.client_siren,
    client_address: quote.client_address,
    client_id: quote.client_id,
    operation_type: quote.operation_type,
  });

  // Lien devis → facture + bascule du statut en accepted (un devis converti
  // est forcément accepté, peu importe qu'on ait cliqué "accepter" avant).
  const acceptedAt = quote.accepted_at ?? new Date().toISOString();
  await supabase
    .from("quotes")
    .update({
      status: "accepted",
      accepted_at: acceptedAt,
      converted_invoice_id: invoice.id,
    })
    .eq("id", quote.id)
    .eq("user_id", userId);

  return { invoiceId: invoice.id, alreadyConverted: false };
}

function formatFr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
