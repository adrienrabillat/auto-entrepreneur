import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadProfile } from "@/lib/invoice-service";
import { generateInvoicePdf, type InvoicePdfData, type OperationType } from "@/lib/pdf";
import { loadLogoForPdf } from "@/lib/logo-loader";

export const dynamic = "force-dynamic";

/**
 * POST /api/invoices/preview
 *
 * Génère un PDF de facture à partir des valeurs du formulaire, sans rien
 * écrire en base. Utilisé par l'étape « Relecture » du wizard Nouvelle facture
 * pour afficher un aperçu fidèle avant que l'utilisateur clique Brouillon
 * ou Créer & envoyer.
 *
 * Le numéro affiché est "APERÇU" (jamais utilisé en prod — le vrai numéro
 * est alloué au moment de l'insert).
 */
type Body = {
  description?: string;
  quantity?: number;
  unit_price_cents?: number;
  amount_cents?: number;
  client_email?: string;
  client_name?: string | null;
  client_siren?: string | null;
  client_address?: string | null;
  operation_type?: OperationType;
  delivery_address?: string | null;
  execution_date?: string | null;
  due_on?: string | null;
  payment_terms?: string | null;
  discount_terms?: string | null;
  prepaid?: boolean;
};

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Body;
  const description = (body.description ?? "").trim() || "—";
  const amount_cents = Math.max(1, Math.floor(Number(body.amount_cents)) || 0);
  const quantity = Math.max(0.01, Number(body.quantity ?? 1));
  const unit_price_cents =
    body.unit_price_cents != null
      ? Math.floor(Number(body.unit_price_cents))
      : Math.round(amount_cents / quantity);
  const operation_type: OperationType =
    body.operation_type === "vente" || body.operation_type === "mixte" ? body.operation_type : "service";

  let profile;
  try {
    profile = await loadProfile(supabase, user.id);
  } catch {
    return NextResponse.json(
      { error: "Profil incomplet — remplis tes infos dans Paramètres avant de prévisualiser." },
      { status: 400 }
    );
  }

  const prepaid = Boolean(body.prepaid);
  const today = new Date().toISOString().slice(0, 10);

  // En mode aperçu, le numéro définitif n'existe pas encore — on affiche
  // un placeholder clairement identifiable pour éviter toute confusion.
  const pdfData: InvoicePdfData = {
    number: "APERÇU",
    issuedOn: today,
    dueOn: body.due_on ?? undefined,
    executionDate: body.execution_date ?? undefined,
    description,
    quantity,
    unitPriceCents: unit_price_cents,
    amountCents: amount_cents,
    currency: "EUR",
    operationType: operation_type,
    deliveryAddress: body.delivery_address ?? undefined,
    paymentTerms: prepaid ? "Déjà réglée" : (body.payment_terms ?? undefined),
    discountTerms: body.discount_terms ?? "Néant",
    paidAt: prepaid ? new Date().toISOString() : undefined,
    seller: {
      displayName: profile.display_name ?? "",
      businessName: profile.business_name ?? undefined,
      legalForm: profile.legal_form,
      metier: profile.metier ?? "",
      siren: profile.siren ?? "",
      siret: profile.siret ?? "",
      apeNaf: profile.ape_naf ?? undefined,
      addressLine1: profile.address_line1 ?? "",
      addressLine2: profile.address_line2 ?? undefined,
      postalCode: profile.postal_code ?? "",
      city: profile.city ?? "",
      country: profile.country || "France",
      phone: profile.phone ?? undefined,
      website: profile.website ?? undefined,
      email: profile.email,
      iban: profile.iban ?? "",
      bic: profile.bic ?? "",
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
      name: body.client_name ?? undefined,
      email: body.client_email ?? "",
      siren: body.client_siren ?? undefined,
      address: body.client_address ?? undefined,
    },
    logo: await loadLogoForPdf(supabase, profile.logo_path),
  };

  try {
    const bytes = await generateInvoicePdf(pdfData);
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "Content-Disposition": 'inline; filename="apercu.pdf"',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erreur de génération PDF";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
