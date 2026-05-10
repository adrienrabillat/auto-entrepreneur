import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInvoicePdf, type InvoicePdfData, type OperationType } from "@/lib/pdf";
import { deliverInvoice, type DeliveryResult } from "@/lib/delivery";
import { loadLogoForPdf } from "@/lib/logo-loader";
import { ensureAsthiaAlias } from "@/lib/asthia-alias";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  nextInvoiceNumber,
  nextDraftNumber,
  finalizeInvoiceNumber,
  nextCreditNoteNumber,
} from "@/lib/invoice-number";
import { formatEUR } from "@/lib/format";

type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  business_name: string | null;
  legal_form: string;
  metier: string | null;
  siren: string | null;
  siret: string | null;
  ape_naf: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  website: string | null;
  iban: string | null;
  bic: string | null;
  rcs_number: string | null;
  rcs_city: string | null;
  rm_number: string | null;
  rm_department: string | null;
  insurance_name: string | null;
  insurance_coverage: string | null;
  mediator_name: string | null;
  mediator_website: string | null;
  gmail_refresh_token: string | null;
  gmail_connected_email: string | null;
  /** Path Storage du logo (bucket 'logos'), ou null si pas uploadé. */
  logo_path: string | null;
  /** Alias unique style "prenom.nom" — utilisé pour construire l'adresse
   *  d'envoi `<alias>@asthia.fr`. Généré au premier envoi si null. */
  asthia_alias: string | null;
};

type InvoiceRow = {
  id: string;
  number: string;
  issued_on: string;
  due_on: string | null;
  execution_date: string | null;
  description: string;
  quantity: number | string;
  unit_price_cents: number | null;
  amount_cents: number;
  currency: string;
  operation_type: OperationType;
  delivery_address: string | null;
  payment_terms: string | null;
  discount_terms: string | null;
  client_id: string | null;
  client_email: string;
  client_name: string | null;
  client_siren: string | null;
  client_address: string | null;
  status?: string;
  paid_at?: string | null;
  invoice_type?: string;
  related_invoice_id?: string | null;
  draft_number?: string | null;
};

export async function loadProfile(supabase: SupabaseClient, userId: string): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function createInvoiceRow(
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
    delivery_address?: string | null;
    execution_date?: string | null;
    payment_terms?: string | null;
    discount_terms?: string | null;
    due_on?: string | null;
    /** Facture acquittée : déjà payée à l'émission. Statut = paid + paid_at = now. */
    prepaid?: boolean;
  }
) {
  const quantity = input.quantity && input.quantity > 0 ? input.quantity : 1;
  const unit_price_cents =
    input.unit_price_cents ?? Math.round(input.amount_cents / quantity);
  const prepaid = Boolean(input.prepaid);

  // Numérotation : les brouillons reçoivent un numéro temporaire (BROUILLON-XXX).
  // Le vrai numéro séquentiel légal n'est attribué qu'au moment de la
  // validation (envoi ou marquage payé). Les factures acquittées (prepaid)
  // reçoivent directement un vrai numéro car elles sont immédiatement validées.
  //
  // Retry logic : la contrainte unique (user_id, number) en base garantit
  // l'unicité. On retente sur 23505 (unique_violation) pour gérer le cas
  // (théorique) de double-clic.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const number = prepaid
      ? await nextInvoiceNumber(supabase, userId)
      : await nextDraftNumber(supabase, userId);
    const { data, error } = await supabase
      .from("invoices")
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
        execution_date: input.execution_date ?? null,
        delivery_address: input.delivery_address ?? null,
        payment_terms: prepaid ? "Déjà réglée" : (input.payment_terms ?? null),
        discount_terms: input.discount_terms ?? "Néant",
        due_on: input.due_on ?? null,
        status: prepaid ? "paid" : "draft",
        paid_at: prepaid ? new Date().toISOString() : null,
        invoice_type: "standard",
        draft_number: prepaid ? null : number,
      })
      .select("*")
      .single();

    if (!error) return data as InvoiceRow;

    // 23505 = unique_violation. On ne retente que si le conflit porte sur le
    // couple (user_id, number) — tout autre conflit est une vraie erreur.
    const isNumberClash =
      (error as { code?: string })?.code === "23505" &&
      /invoices_user_id_number_key|\(number\)|\bnumber\b/i.test(error.message || "");
    if (isNumberClash && attempt < MAX_ATTEMPTS) continue;
    throw error;
  }
  // Inatteignable en pratique — garde-fou TS + protection contre une boucle silencieuse.
  throw new Error(
    `Impossible d'attribuer un numéro de facture unique après ${MAX_ATTEMPTS} tentatives.`
  );
}

export function pdfDataFromInvoice(
  profile: Profile,
  invoice: InvoiceRow,
  /** Numéro de la facture originale, requis lorsque `invoice` est un avoir
   *  pour afficher la mention "Avoir relatif à la facture XXX" dans le PDF. */
  relatedInvoiceNumber?: string,
  /** Logo déjà téléchargé (cf. `loadLogoForPdf`). Optionnel — si absent
   *  le PDF se génère sans logo. */
  logo?: { bytes: Uint8Array; mimeType: "image/png" | "image/jpeg" },
): InvoicePdfData {
  assertProfileReady(profile);
  const isCreditNote = invoice.invoice_type === "credit_note";
  const qty = Number(invoice.quantity) || 1;
  // Pour les avoirs, les montants sont stockés en négatif en base.
  // Le PDF doit les afficher en positif avec le titre "AVOIR".
  const absAmount = Math.abs(invoice.amount_cents);
  const unit = invoice.unit_price_cents != null
    ? Math.abs(invoice.unit_price_cents)
    : Math.round(absAmount / qty);
  // "Acquittée" : ne s'applique QU'aux vraies factures payées. Pour un avoir,
  // status='paid' est interne (déclaration URSSAF) et ne doit pas apparaître
  // visuellement comme "PAYÉE LE …" sur le PDF — l'avoir ne représente pas
  // un paiement reçu mais un crédit émis.
  const paidAt =
    !isCreditNote && invoice.status === "paid" && invoice.paid_at
      ? invoice.paid_at
      : undefined;
  return {
    number: invoice.number,
    documentKind: isCreditNote ? "credit_note" : "invoice",
    issuedOn: invoice.issued_on,
    dueOn: invoice.due_on ?? undefined,
    executionDate: invoice.execution_date ?? undefined,
    description: invoice.description,
    quantity: qty,
    unitPriceCents: unit,
    amountCents: absAmount,
    currency: invoice.currency || "EUR",
    operationType: invoice.operation_type,
    deliveryAddress: invoice.delivery_address ?? undefined,
    paymentTerms: invoice.payment_terms ?? undefined,
    discountTerms: invoice.discount_terms ?? "Néant",
    paidAt,
    relatedInvoiceNumber: isCreditNote ? relatedInvoiceNumber : undefined,
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
      email: profile.email,
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
      name: invoice.client_name ?? undefined,
      email: invoice.client_email,
      siren: invoice.client_siren ?? undefined,
      address: invoice.client_address ?? undefined,
    },
    logo,
  };
}

export async function sendInvoice(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string
) {
  const profile = await loadProfile(supabase, userId);
  // On ne pré-vérifie plus Gmail ici : le dispatcher gère le choix du canal
  // (PDP si B2B FR + configurée, sinon Gmail). Il jette une erreur claire si
  // aucun canal n'est disponible (Gmail déconnecté ET PDP non configurée).

  const { data: invoiceRaw, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  let invoice = invoiceRaw as InvoiceRow & { imported?: boolean };

  // Sprint 4 : les factures importées d'un autre logiciel sont figées —
  // pas d'envoi par email Asthia (sinon l'AE risque de spammer son client
  // avec un duplicata d'une facture qu'il a déjà reçue ailleurs).
  if (invoice.imported) {
    throw new Error("Une facture importée ne peut pas être renvoyée par email depuis Asthia.");
  }

  // Finalisation du numéro : si la facture a encore un numéro brouillon,
  // on lui attribue le vrai numéro séquentiel légal maintenant.
  if (invoice.number?.startsWith("BROUILLON-")) {
    const finalNumber = await finalizeInvoiceNumber(supabase, userId, invoiceId);
    invoice = { ...invoice, number: finalNumber };
  }

  // Pour un avoir, charger le numéro de la facture originale (mention
  // "Avoir relatif à la facture XXX" dans le PDF + email).
  const isCreditNote = invoice.invoice_type === "credit_note";
  let relatedNumber: string | undefined;
  if (isCreditNote && invoice.related_invoice_id) {
    const { data: original } = await supabase
      .from("invoices")
      .select("number")
      .eq("id", invoice.related_invoice_id)
      .eq("user_id", userId)
      .maybeSingle();
    relatedNumber = original?.number;
  }

  // Logo (optionnel). Téléchargé une fois ici pour être passé au PDF
  // sans refaire un round-trip Storage côté pdf.ts.
  const logo = await loadLogoForPdf(supabase, profile.logo_path);

  // Alias Asthia : généré au premier envoi (lazy backfill). Utilise un
  // client admin parce que la résolution scanne tous les profils pour
  // détecter les collisions, et la RLS user-scopée bloquerait la lecture.
  const asthiaAlias = await ensureAsthiaAlias(createAdminClient(), userId);

  const pdfBytes = await generateInvoicePdf(
    pdfDataFromInvoice(profile, invoice, relatedNumber, logo),
  );
  const filename = isCreditNote
    ? `avoir-${invoice.number}.pdf`
    : `facture-${invoice.number}.pdf`;
  const storagePath = `${userId}/${invoice.id}/${filename}`;

  const { error: upErr } = await supabase.storage
    .from("invoices")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;

  // Pour un avoir, on ne parle pas de "Facture acquittée" même si en base
  // status='paid' — c'est un détail comptable interne, pas un message client.
  const alreadyPaid = !isCreditNote && (invoice.status === "paid" || Boolean(invoice.paid_at));
  // L'avoir est stocké en montant négatif en base ; on l'affiche en valeur
  // absolue dans la communication client (le PDF affiche déjà "À déduire").
  const prettyAmount = formatEUR(Math.abs(invoice.amount_cents));

  const subject = isCreditNote
    ? `Avoir ${invoice.number} — ${profile.display_name}`
    : alreadyPaid
      ? `Facture acquittée ${invoice.number} — ${profile.display_name}`
      : `Facture ${invoice.number} — ${profile.display_name}`;

  const greeting = `Bonjour${invoice.client_name ? " " + invoice.client_name : ""},`;
  const signature = [
    profile.display_name,
    profile.metier ?? "",
  ].filter(Boolean).join("\n");

  const text = isCreditNote
    ? [
        greeting,
        ``,
        `Tu trouveras en pièce jointe l'avoir ${invoice.number} d'un montant de ${prettyAmount}${
          relatedNumber ? ` relatif à la facture ${relatedNumber}` : ""
        }.`,
        ``,
        `Motif : ${invoice.description}`,
        ``,
        `Cet avoir sera déduit d'une prochaine facture ou remboursé selon les modalités convenues.`,
        ``,
        `Bien à toi,`,
        signature,
      ].join("\n")
    : alreadyPaid
      ? [
          greeting,
          ``,
          `Voici en pièce jointe la facture ${invoice.number} (${prettyAmount}) — acquittée, aucun règlement n'est dû.`,
          ``,
          `Objet : ${invoice.description}`,
          ``,
          `Merci pour la confiance,`,
          signature,
        ].join("\n")
      : [
          greeting,
          ``,
          `Tu trouveras en pièce jointe la facture ${invoice.number} d'un montant de ${prettyAmount}.`,
          ``,
          `Objet : ${invoice.description}`,
          ``,
          `Merci !`,
          signature,
        ].join("\n");

  const htmlGreeting = `<p>Bonjour${invoice.client_name ? " " + escapeHtml(invoice.client_name) : ""},</p>`;
  const htmlSignature = `<br/>${escapeHtml(profile.display_name ?? "")}<br/><span style="color:#6B6B68">${escapeHtml(profile.metier ?? "")}</span>`;

  // Bannière logo en haut du mail si l'AE a uploadé un logo.
  // Le `<img src="cid:logo">` référence l'inline attachment passé via
  // `email.inlineAttachments`. Tous les clients mail gèrent les CID,
  // y compris Gmail (qui par défaut bloque les images externes mais
  // affiche les inline).
  const htmlLogoBanner = logo
    ? `<div style="padding-bottom:18px;margin-bottom:16px;border-bottom:1px solid #E2E8F0;">
        <img src="cid:logo" alt="${escapeHtml(profile.display_name ?? "")}" style="max-height:48px;max-width:240px;display:block;" />
      </div>`
    : "";

  const html = isCreditNote
    ? `<!doctype html><meta charset="utf-8" /><div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#37352F;line-height:1.55;">
        ${htmlLogoBanner}
        ${htmlGreeting}
        <p>Tu trouveras en pièce jointe l'avoir <strong>${invoice.number}</strong> d'un montant de <strong>${prettyAmount}</strong>${
          relatedNumber ? ` relatif à la facture <strong>${escapeHtml(relatedNumber)}</strong>` : ""
        }.</p>
        <p style="background:#F1F5F9;border:1px solid #94A3B8;border-radius:8px;padding:10px 14px;color:#334155;"><strong>Avoir à valoir</strong><br/>Cet avoir sera déduit d'une prochaine facture ou remboursé selon les modalités convenues.</p>
        <p><em>Motif :</em> ${escapeHtml(invoice.description)}</p>
        <p>Bien à toi,${htmlSignature}</p>
      </div>`
    : alreadyPaid
      ? `<!doctype html><meta charset="utf-8" /><div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#37352F;line-height:1.55;">
          ${htmlLogoBanner}
          ${htmlGreeting}
          <p>Voici en pièce jointe la facture <strong>${invoice.number}</strong> d'un montant de <strong>${prettyAmount}</strong>.</p>
          <p style="background:#ECF8EE;border:1px solid #16A34A;border-radius:8px;padding:10px 14px;color:#14532D;"><strong>Facture acquittée · Solde dû : 0,00 €</strong><br/>Aucun règlement n'est dû.</p>
          <p><em>Objet :</em> ${escapeHtml(invoice.description)}</p>
          <p>Merci pour la confiance,${htmlSignature}</p>
        </div>`
      : `<!doctype html><meta charset="utf-8" /><div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#37352F;line-height:1.55;">
          ${htmlLogoBanner}
          ${htmlGreeting}
          <p>Tu trouveras en pièce jointe la facture <strong>${invoice.number}</strong> d'un montant de <strong>${prettyAmount}</strong>.</p>
          <p><em>Objet :</em> ${escapeHtml(invoice.description)}</p>
          <p>Merci !${htmlSignature}</p>
        </div>`;

  // Dispatcher : choisit automatiquement Gmail ou PDP selon le destinataire
  // et la configuration (env PDP_PROVIDER). Tant que PDP n'est pas activée,
  // tout passe via Gmail — comportement strictement identique à avant.
  const delivery: DeliveryResult = await deliverInvoice({
    recipient: {
      siren: invoice.client_siren,
      countryCode: "FR",
      email: invoice.client_email,
      name: invoice.client_name,
    },
    invoice: {
      id: invoice.id,
      number: invoice.number,
      description: invoice.description,
      amount_cents: invoice.amount_cents,
      prepaid: alreadyPaid,
    },
    pdf: { bytes: pdfBytes, filename },
    email: {
      subject,
      text,
      html,
      bccSelf: true,
      // Logo en pièce jointe inline (référencée par <img src="cid:logo">
      // dans le HTML). Si pas de logo, pas d'attachment — la bannière
      // n'est pas non plus rendue côté HTML.
      inlineAttachments: logo
        ? [
            {
              contentId: "logo",
              filename: `logo.${logo.mimeType === "image/png" ? "png" : "jpg"}`,
              contentType: logo.mimeType,
              bytes: logo.bytes,
            },
          ]
        : undefined,
    },
    sender: {
      displayName: profile.display_name ?? profile.email,
      email: profile.email,
      asthiaAddress: `${asthiaAlias}@asthia.fr`,
    },
  });
  // delivery.channel / reference / status seront utilisés plus tard pour
  // stocker la trace PDP en base et remonter les statuts dans l'UI.
  // Si acquittée : on ne redescend PAS le statut à "sent" (sinon on perd
  // l'info payé). On garde status=paid, on note juste sent_at + pdf_path.
  // On stocke aussi le `resend_email_id` pour matcher les events de
  // tracking (delivered, opened, bounced, complained) qui arriveront
  // via le webhook /api/webhooks/resend-events.
  const patch: Record<string, unknown> = {
    sent_at: new Date().toISOString(),
    pdf_path: storagePath,
    resend_email_id: delivery.reference,
    delivery_status: "sent",
    last_event_at: delivery.deliveredAtIso,
  };
  if (!alreadyPaid) patch.status = "sent";
  const { error: updErr } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", invoice.id);
  if (updErr) throw updErr;

  return { ok: true as const };
}

/**
 * Mise à jour d'une facture brouillon. Seules les factures en statut
 * 'draft' sont modifiables librement — pas de contrainte légale.
 */
export async function updateDraftInvoice(
  supabase: SupabaseClient,
  userId: string,
  invoiceId: string,
  input: {
    description?: string;
    quantity?: number;
    unit_price_cents?: number;
    amount_cents?: number;
    operation_type?: OperationType;
    execution_date?: string | null;
    delivery_address?: string | null;
    due_on?: string | null;
    discount_terms?: string | null;
  }
) {
  // Vérifier que la facture est bien un brouillon STANDARD (pas un avoir,
  // pas une facture importée).
  // - Un avoir, même en draft, a déjà un numéro légal et ne doit pas être
  //   modifiable.
  // - Une facture importée vient d'un autre logiciel : modifier son contenu
  //   créerait une incohérence avec l'historique de l'autre outil.
  const { data: invoice, error: getErr } = await supabase
    .from("invoices")
    .select("id, status, invoice_type, imported")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (getErr) throw getErr;
  if (!invoice) throw new Error("Facture introuvable.");
  if (invoice.imported) {
    throw new Error("Une facture importée est figée en lecture seule.");
  }
  if (invoice.status !== "draft") {
    throw new Error("Seuls les brouillons peuvent être modifiés directement.");
  }
  if (invoice.invoice_type === "credit_note") {
    throw new Error("Un avoir ne peut pas être modifié : son numéro légal est figé.");
  }

  const patch: Record<string, unknown> = {};
  if (input.description !== undefined) patch.description = input.description;
  if (input.quantity !== undefined) patch.quantity = input.quantity;
  if (input.unit_price_cents !== undefined) patch.unit_price_cents = input.unit_price_cents;
  if (input.amount_cents !== undefined) patch.amount_cents = input.amount_cents;
  if (input.operation_type !== undefined) patch.operation_type = input.operation_type;
  if (input.execution_date !== undefined) patch.execution_date = input.execution_date;
  if (input.delivery_address !== undefined) patch.delivery_address = input.delivery_address;
  if (input.due_on !== undefined) patch.due_on = input.due_on;
  if (input.discount_terms !== undefined) patch.discount_terms = input.discount_terms;

  if (Object.keys(patch).length === 0) return;

  const { error: updErr } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", invoiceId)
    .eq("user_id", userId);

  if (updErr) throw updErr;
}

/**
 * Crée un avoir (credit note) lié à une facture existante.
 *
 * Cas 2 (envoyée non payée) : avoir d'annulation totale → nouvelle facture brouillon.
 * Cas 3 (payée) : avoir partiel ou total.
 *
 * L'avoir est une facture avec :
 * - invoice_type = 'credit_note'
 * - related_invoice_id = id de la facture originale
 * - amount_cents négatif (convention comptable)
 * - Numéro dans la séquence légale, préfixé "AV-"
 *
 * Retourne { creditNote, newDraft? } :
 * - creditNote : l'avoir créé
 * - newDraft : uniquement pour le cas 2, le brouillon correctif créé
 */
export async function createCreditNote(
  supabase: SupabaseClient,
  userId: string,
  originalInvoiceId: string,
  input: {
    /** Montant de l'avoir en centimes (positif). Par défaut : total de la facture originale. */
    amount_cents?: number;
    /** Motif / description de l'avoir */
    reason?: string;
    /** Si true (cas 2 — envoyée non payée), on crée aussi une facture brouillon correctif */
    createCorrectiveDraft?: boolean;
  } = {}
) {
  // 1. Charger la facture originale
  const { data: original, error: getErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", originalInvoiceId)
    .eq("user_id", userId)
    .single();

  if (getErr) throw getErr;
  if (!original) throw new Error("Facture originale introuvable.");
  if (original.status === "draft") {
    throw new Error("Pas besoin d'avoir pour un brouillon — modifie-le directement.");
  }
  if (original.invoice_type === "credit_note") {
    throw new Error("Impossible de créer un avoir sur un avoir.");
  }
  // Sprint 4 : on refuse les avoirs sur les factures importées. Le numéro
  // de l'avoir entrerait dans la séquence Asthia mais référencerait une
  // facture hors-séquence (importée), ce qui crée une incohérence légale.
  if ((original as { imported?: boolean }).imported) {
    throw new Error(
      "Impossible de créer un avoir sur une facture importée. Émets l'avoir directement dans le logiciel d'origine.",
    );
  }

  // Calcul du montant déjà avoirisé sur cette facture pour éviter le
  // sur-avoir : on peut faire plusieurs avoirs partiels mais leur somme
  // ne doit jamais dépasser le montant de la facture originale, sinon on
  // émettrait un crédit supérieur à ce que le client a payé.
  //
  // Les avoirs sont stockés avec amount_cents NÉGATIF — on prend la valeur
  // absolue pour les sommer.
  const { data: existingCreditNotes } = await supabase
    .from("invoices")
    .select("amount_cents")
    .eq("user_id", userId)
    .eq("related_invoice_id", originalInvoiceId)
    .eq("invoice_type", "credit_note");

  const alreadyCreditedCents = (existingCreditNotes ?? []).reduce(
    (sum, cn) => sum + Math.abs(cn.amount_cents as number),
    0,
  );
  const remainingCancellableCents = original.amount_cents - alreadyCreditedCents;

  if (remainingCancellableCents <= 0) {
    throw new Error(
      `Cette facture a déjà été entièrement avoirisée (${formatEUR(alreadyCreditedCents)} sur ${formatEUR(original.amount_cents)}).`,
    );
  }

  const creditAmountCents = input.amount_cents ?? remainingCancellableCents;
  if (creditAmountCents <= 0) {
    throw new Error("Le montant de l'avoir doit être strictement positif.");
  }
  if (creditAmountCents > remainingCancellableCents) {
    const remaining = formatEUR(remainingCancellableCents);
    const original_total = formatEUR(original.amount_cents);
    throw new Error(
      alreadyCreditedCents > 0
        ? `Avoir trop élevé : il reste ${remaining} avoirisable sur cette facture (${formatEUR(alreadyCreditedCents)} déjà émis sur ${original_total}).`
        : `Montant de l'avoir invalide (max ${original_total}).`,
    );
  }

  const creditNoteNumber = await nextCreditNoteNumber(supabase, userId);
  const reason = input.reason?.trim() || `Avoir sur facture ${original.number}`;
  // "Full cancel" = la somme cumulée des avoirs (existants + nouveau) atteint
  // le montant de la facture originale. C'est dans ce cas seulement qu'on
  // marque l'originale comme cancelled (et uniquement si elle était 'sent',
  // cf. Fix #3 plus bas).
  const isFullCancel =
    alreadyCreditedCents + creditAmountCents === original.amount_cents;

  // 2. Créer l'avoir.
  //
  // L'avoir est créé directement en `status: 'paid'` avec `paid_at = now()` :
  //
  // - Légalement, un avoir est un acte d'émission immédiat (il n'a pas
  //   d'état "brouillon" comme une facture, son numéro est déjà figé dans
  //   la séquence chronologique URSSAF dès la création).
  // - Comptablement, le `paid_at` représente la date d'effet du crédit.
  //   Cela garantit que l'avoir est inclus dans la déclaration URSSAF du
  //   mois en cours (avec amount_cents négatif → réduit le CA déclaré).
  //   Sans cela, un avoir partiel sur une facture payée ne réduirait pas
  //   le CA et l'AE déclarerait plus que ce qu'il a réellement encaissé.
  const nowIso = new Date().toISOString();
  const { data: creditNote, error: cnErr } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      number: creditNoteNumber,
      invoice_type: "credit_note",
      related_invoice_id: originalInvoiceId,
      description: reason,
      quantity: original.quantity,
      unit_price_cents: original.unit_price_cents
        ? -Math.round((creditAmountCents / (Number(original.quantity) || 1)))
        : null,
      amount_cents: -creditAmountCents,
      currency: original.currency,
      operation_type: original.operation_type,
      client_id: original.client_id,
      client_email: original.client_email,
      client_name: original.client_name,
      client_siren: original.client_siren,
      client_address: original.client_address,
      execution_date: original.execution_date,
      delivery_address: original.delivery_address,
      discount_terms: original.discount_terms ?? "Néant",
      status: "paid",
      paid_at: nowIso,
    })
    .select("*")
    .single();

  if (cnErr) throw cnErr;

  // 3. Marquer la facture originale comme annulée — UNIQUEMENT si elle
  //    était `sent` (cas 2 : facture envoyée non payée → on l'annule
  //    proprement et on émet un brouillon correctif).
  //
  //    Pour une facture déjà PAID (cas 3), on NE la passe PAS à 'cancelled'
  //    même en cas d'avoir total : comptablement, le client a réellement
  //    payé et la facture reste valide ; c'est l'avoir négatif qui neutralise
  //    le CA. Marquer la facture "cancelled" effacerait à tort l'historique
  //    du paiement reçu.
  if (isFullCancel && original.status === "sent") {
    await supabase
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("id", originalInvoiceId)
      .eq("user_id", userId);
  }

  // 4. Cas 2 : créer un brouillon correctif (copie de l'originale)
  let newDraft = null;
  if (input.createCorrectiveDraft) {
    const draftNumber = await nextDraftNumber(supabase, userId);
    const { data: draft, error: draftErr } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        number: draftNumber,
        invoice_type: "standard",
        description: original.description,
        quantity: original.quantity,
        unit_price_cents: original.unit_price_cents,
        amount_cents: original.amount_cents,
        currency: original.currency,
        operation_type: original.operation_type,
        client_id: original.client_id,
        client_email: original.client_email,
        client_name: original.client_name,
        client_siren: original.client_siren,
        client_address: original.client_address,
        execution_date: null, // Nouvelle date à renseigner
        delivery_address: original.delivery_address,
        discount_terms: original.discount_terms ?? "Néant",
        due_on: null,
        status: "draft",
        draft_number: draftNumber,
      })
      .select("*")
      .single();

    if (draftErr) throw draftErr;
    newDraft = draft;
  }

  return {
    creditNote: creditNote as InvoiceRow,
    newDraft: newDraft as InvoiceRow | null,
  };
}

function assertProfileReady(p: Profile) {
  const missing: string[] = [];
  if (!p.display_name) missing.push("nom");
  if (!p.metier) missing.push("activité");
  if (!p.siren || !/^\d{9}$/.test(p.siren.replace(/\s/g, ""))) missing.push("SIREN (9 chiffres)");
  if (!p.siret || !/^\d{14}$/.test(p.siret.replace(/\s/g, ""))) missing.push("SIRET (14 chiffres)");
  if (!p.address_line1) missing.push("adresse");
  if (!p.postal_code) missing.push("code postal");
  if (!p.city) missing.push("ville");
  if (!p.iban || p.iban.replace(/\s/g, "").length < 15) missing.push("IBAN");
  if (!p.bic || p.bic.replace(/\s/g, "").length < 8) missing.push("BIC");
  if (missing.length) {
    throw new Error(`Profil incomplet (${missing.join(", ")}). Va dans Profil pour compléter.`);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}
