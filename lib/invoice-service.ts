import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInvoicePdf, type InvoicePdfData, type OperationType } from "@/lib/pdf";
import { deliverInvoice, type DeliveryResult } from "@/lib/delivery";
import { nextInvoiceNumber } from "@/lib/invoice-number";
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

  // Numérotation facture : la contrainte unique (user_id, number) en base
  // garantit l'unicité, mais deux requêtes parallèles peuvent calculer le même
  // "next" (lecture puis insert non atomiques). On retente tant que Postgres
  // renvoie 23505 (unique_violation) sur cette contrainte. En pratique ça
  // n'arrive quasiment jamais (3 utilisateurs, jamais de créations concurrentes)
  // mais ça nous protège contre un double-clic ou un lancement simultané.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const number = await nextInvoiceNumber(supabase, userId);
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

export function pdfDataFromInvoice(profile: Profile, invoice: InvoiceRow): InvoicePdfData {
  assertProfileReady(profile);
  const qty = Number(invoice.quantity) || 1;
  const unit = invoice.unit_price_cents ?? Math.round(invoice.amount_cents / qty);
  // "Acquittée" si le statut est payé ET que la date de paiement est ≤ la date d'émission
  // (marqueur d'une facture émise déjà payée, par opposition à un paiement reçu plus tard).
  const paidAt = invoice.status === "paid" && invoice.paid_at ? invoice.paid_at : undefined;
  return {
    number: invoice.number,
    issuedOn: invoice.issued_on,
    dueOn: invoice.due_on ?? undefined,
    executionDate: invoice.execution_date ?? undefined,
    description: invoice.description,
    quantity: qty,
    unitPriceCents: unit,
    amountCents: invoice.amount_cents,
    currency: invoice.currency || "EUR",
    operationType: invoice.operation_type,
    deliveryAddress: invoice.delivery_address ?? undefined,
    paymentTerms: invoice.payment_terms ?? undefined,
    discountTerms: invoice.discount_terms ?? "Néant",
    paidAt,
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
      name: invoice.client_name ?? undefined,
      email: invoice.client_email,
      siren: invoice.client_siren ?? undefined,
      address: invoice.client_address ?? undefined,
    },
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
  const invoice = invoiceRaw as InvoiceRow;

  const pdfBytes = await generateInvoicePdf(pdfDataFromInvoice(profile, invoice));
  const filename = `facture-${invoice.number}.pdf`;
  const storagePath = `${userId}/${invoice.id}/${filename}`;

  const { error: upErr } = await supabase.storage
    .from("invoices")
    .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw upErr;

  const alreadyPaid = invoice.status === "paid" || Boolean(invoice.paid_at);
  const prettyAmount = formatEUR(invoice.amount_cents);

  const subject = alreadyPaid
    ? `Facture acquittée ${invoice.number} — ${profile.display_name}`
    : `Facture ${invoice.number} — ${profile.display_name}`;

  const text = alreadyPaid
    ? [
        `Bonjour${invoice.client_name ? " " + invoice.client_name : ""},`,
        ``,
        `Voici en pièce jointe la facture ${invoice.number} (${prettyAmount}) — acquittée, aucun règlement n'est dû.`,
        ``,
        `Objet : ${invoice.description}`,
        ``,
        `Merci pour la confiance,`,
        profile.display_name,
        profile.metier ?? "",
      ].join("\n")
    : [
        `Bonjour${invoice.client_name ? " " + invoice.client_name : ""},`,
        ``,
        `Tu trouveras en pièce jointe la facture ${invoice.number} d'un montant de ${prettyAmount}.`,
        ``,
        `Objet : ${invoice.description}`,
        ``,
        `Merci !`,
        profile.display_name,
        profile.metier ?? "",
      ].join("\n");

  const html = alreadyPaid
    ? `<!doctype html><meta charset="utf-8" /><div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#37352F;line-height:1.55;">
        <p>Bonjour${invoice.client_name ? " " + escapeHtml(invoice.client_name) : ""},</p>
        <p>Voici en pièce jointe la facture <strong>${invoice.number}</strong> d'un montant de <strong>${prettyAmount}</strong>.</p>
        <p style="background:#ECF8EE;border:1px solid #16A34A;border-radius:8px;padding:10px 14px;color:#14532D;"><strong>Facture acquittée · Solde dû : 0,00 €</strong><br/>Aucun règlement n'est dû.</p>
        <p><em>Objet :</em> ${escapeHtml(invoice.description)}</p>
        <p>Merci pour la confiance,<br/>${escapeHtml(profile.display_name ?? "")}<br/><span style="color:#6B6B68">${escapeHtml(profile.metier ?? "")}</span></p>
      </div>`
    : `<!doctype html><meta charset="utf-8" /><div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#37352F;line-height:1.55;">
        <p>Bonjour${invoice.client_name ? " " + escapeHtml(invoice.client_name) : ""},</p>
        <p>Tu trouveras en pièce jointe la facture <strong>${invoice.number}</strong> d'un montant de <strong>${prettyAmount}</strong>.</p>
        <p><em>Objet :</em> ${escapeHtml(invoice.description)}</p>
        <p>Merci !<br/>${escapeHtml(profile.display_name ?? "")}<br/><span style="color:#6B6B68">${escapeHtml(profile.metier ?? "")}</span></p>
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
    email: { subject, text, html, bccSelf: true },
    sender: {
      displayName: profile.display_name ?? profile.gmail_connected_email ?? profile.email,
      email: profile.email,
      gmailRefreshToken: profile.gmail_refresh_token,
      gmailConnectedEmail: profile.gmail_connected_email,
    },
  });
  // delivery.channel / reference / status seront utilisés plus tard pour
  // stocker la trace PDP en base et remonter les statuts dans l'UI.
  void delivery;

  // Si acquittée : on ne redescend PAS le statut à "sent" (sinon on perd
  // l'info payé). On garde status=paid, on note juste sent_at + pdf_path.
  const patch: Record<string, unknown> = {
    sent_at: new Date().toISOString(),
    pdf_path: storagePath,
  };
  if (!alreadyPaid) patch.status = "sent";
  const { error: updErr } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", invoice.id);
  if (updErr) throw updErr;

  return { ok: true as const };
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
