import type { SupabaseClient } from "@supabase/supabase-js";
import { generateInvoicePdf, type InvoicePdfData, type OperationType } from "@/lib/pdf";
import { sendGmail } from "@/lib/gmail";
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
  iban: string | null;
  bic: string | null;
  gmail_refresh_token: string | null;
  gmail_connected_email: string | null;
};

type InvoiceRow = {
  id: string;
  number: string;
  issued_on: string;
  due_on: string | null;
  description: string;
  amount_cents: number;
  currency: string;
  operation_type: OperationType;
  delivery_address: string | null;
  client_email: string;
  client_name: string | null;
  client_siren: string | null;
  client_address: string | null;
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
    client_email: string;
    client_name?: string | null;
    client_siren?: string | null;
    client_address?: string | null;
    operation_type?: OperationType;
    delivery_address?: string | null;
    due_on?: string | null;
  }
) {
  const number = await nextInvoiceNumber(supabase, userId);
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      number,
      description: input.description,
      amount_cents: input.amount_cents,
      client_email: input.client_email,
      client_name: input.client_name ?? null,
      client_siren: input.client_siren ?? null,
      client_address: input.client_address ?? null,
      operation_type: input.operation_type ?? "service",
      delivery_address: input.delivery_address ?? null,
      due_on: input.due_on ?? null,
      status: "draft",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as InvoiceRow;
}

export function pdfDataFromInvoice(profile: Profile, invoice: InvoiceRow): InvoicePdfData {
  assertProfileReady(profile);
  return {
    number: invoice.number,
    issuedOn: invoice.issued_on,
    dueOn: invoice.due_on ?? undefined,
    description: invoice.description,
    amountCents: invoice.amount_cents,
    currency: invoice.currency || "EUR",
    operationType: invoice.operation_type,
    deliveryAddress: invoice.delivery_address ?? undefined,
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
      email: profile.gmail_connected_email ?? profile.email,
      iban: profile.iban ?? undefined,
      bic: profile.bic ?? undefined,
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
  if (!profile.gmail_refresh_token || !profile.gmail_connected_email) {
    throw new Error("Gmail non connecté. Reconnecte-toi avec Google depuis la page d'accueil.");
  }

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

  const subject = `Facture ${invoice.number} — ${profile.display_name}`;
  const prettyAmount = formatEUR(invoice.amount_cents);
  const text = [
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
  const html = `<!doctype html><meta charset="utf-8" /><div style="font-family:Inter,Helvetica,Arial,sans-serif;color:#37352F;line-height:1.55;">
    <p>Bonjour${invoice.client_name ? " " + escapeHtml(invoice.client_name) : ""},</p>
    <p>Tu trouveras en pièce jointe la facture <strong>${invoice.number}</strong> d'un montant de <strong>${prettyAmount}</strong>.</p>
    <p><em>Objet :</em> ${escapeHtml(invoice.description)}</p>
    <p>Merci !<br/>${escapeHtml(profile.display_name ?? "")}<br/><span style="color:#6B6B68">${escapeHtml(profile.metier ?? "")}</span></p>
  </div>`;

  await sendGmail({
    refreshToken: profile.gmail_refresh_token,
    fromEmail: profile.gmail_connected_email,
    fromName: profile.display_name ?? profile.gmail_connected_email,
    to: invoice.client_email,
    subject,
    text,
    html,
    bccSelf: true,
    attachment: { filename, contentType: "application/pdf", content: pdfBytes },
  });

  const { error: updErr } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString(), pdf_path: storagePath })
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
  if (missing.length) {
    throw new Error(`Profil incomplet (${missing.join(", ")}). Va dans Profil pour compléter.`);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]!));
}
