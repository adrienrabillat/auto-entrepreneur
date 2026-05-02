import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { formatDate, formatEUR } from "@/lib/format";
import { QuoteActions } from "./actions";
import { ArrowLeft, ExternalLink, ArrowRight } from "lucide-react";
import { cleanClientName } from "@/lib/display-name";

export const dynamic = "force-dynamic";

/**
 * Page détail d'un devis. Calque /invoices/[id] avec :
 *  - Bandeau spécifique si le devis a été converti en facture (lien vers
 *    la facture créée)
 *  - Actions adaptées : envoyer, accepter, refuser, convertir, supprimer
 */
export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();

  // Embedded select Supabase via la FK converted_invoice_id → invoices(id) :
  // on récupère le numéro de la facture liée DANS la même requête que le devis,
  // au lieu d'un round-trip DB conditionnel après. Économie : 1 aller-retour
  // sur tous les devis convertis en facture (~70-150ms typique).
  // Le résultat est nesté sous la clé `converted_invoice` (alias choisi).
  const [quoteRes, profileRes] = await Promise.all([
    supabase
      .from("quotes")
      .select("*, converted_invoice:invoices!converted_invoice_id(number)")
      .eq("id", params.id)
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("gmail_refresh_token")
      .eq("id", user!.id)
      .maybeSingle(),
  ]);
  const quote = quoteRes.data as
    | (typeof quoteRes.data & { converted_invoice: { number: string } | null })
    | null;
  if (!quote) notFound();
  const gmailConnected = Boolean(profileRes.data?.gmail_refresh_token);
  const convertedInvoiceNumber = quote.converted_invoice?.number ?? null;

  // Cas spécial : le devis a un converted_invoice_id mais le JOIN ne renvoie
  // rien → la facture liée a été supprimée (brouillon supprimé par l'user).
  // On réactive les actions pour permettre une nouvelle conversion.
  const invoiceDeleted = Boolean(quote.converted_invoice_id) && !quote.converted_invoice;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in-up">
      <div>
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1 text-small text-ink-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft size={14} /> Devis
        </Link>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-small text-ink-500">Devis</div>
            <h1 className="text-h1 tabular-nums">{quote.number}</h1>
          </div>
          <StatusDot
            status={quote.status}
            converted={Boolean(quote.converted_invoice_id)}
          />
        </div>
      </div>

      {/* Bandeau de conversion : visible si le devis a été transformé en facture
          ET que cette facture existe toujours */}
      {quote.converted_invoice_id && !invoiceDeleted ? (
        <div className="rounded-2xl bg-success-500/10 border border-success-500/20 p-4 flex items-center justify-between gap-3">
          <div className="text-small">
            <div className="font-medium text-success-700">
              Ce devis a été converti en facture
            </div>
            {convertedInvoiceNumber ? (
              <div className="text-ink-600 mt-0.5">
                Facture <span className="tabular-nums font-medium">{convertedInvoiceNumber}</span>
              </div>
            ) : null}
          </div>
          <Link
            href={`/invoices/${quote.converted_invoice_id}`}
            className="pill pill-ghost"
          >
            Voir la facture <ArrowRight size={14} />
          </Link>
        </div>
      ) : null}

      {/* Bandeau d'avertissement : la facture liée a été supprimée */}
      {invoiceDeleted ? (
        <div className="rounded-2xl bg-warn-500/10 border border-warn-500/20 p-4 text-small">
          <div className="font-medium text-warn-700">
            La facture associée a été supprimée
          </div>
          <div className="text-ink-600 mt-0.5">
            Tu peux reconvertir ce devis en facture ou le modifier.
          </div>
        </div>
      ) : null}

      {/* Hero montant */}
      <section className="surface relative overflow-hidden p-7 md:p-9">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-20 h-80 w-80 rounded-full"
          style={{ background: "radial-gradient(circle at center, var(--accent-soft) 0%, transparent 65%)" }}
        />
        <div className="relative">
          <div className="text-small text-ink-500">Montant</div>
          <div
            className="mt-1 font-bold tabular-nums tracking-[-0.035em] leading-none text-ink-900"
            style={{ fontSize: "clamp(44px, 6vw, 64px)" }}
          >
            {formatEUR(quote.amount_cents)}
          </div>
          <div className="mt-3 text-small text-ink-500">
            Pour {cleanClientName(quote.client_name) || quote.client_email}
          </div>
        </div>
      </section>

      <section className="surface p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-small">
          <Field label="Client">{cleanClientName(quote.client_name) || quote.client_email}</Field>
          <Field label="Email">{quote.client_email}</Field>
          <Field label="Émis le">{formatDate(quote.issued_on)}</Field>
          <Field label="Validité">
            {quote.valid_until ? formatDate(quote.valid_until) : "—"}
          </Field>
          <Field label="Envoyé le">{quote.sent_at ? formatDate(quote.sent_at) : "—"}</Field>
          <Field label="Accepté le">
            {quote.accepted_at ? formatDate(quote.accepted_at) : "—"}
          </Field>
        </div>

        <div>
          <div className="text-small text-ink-500 mb-1">Description</div>
          <p className="text-body text-ink-800 whitespace-pre-wrap">{quote.description}</p>
        </div>

        {quote.notes ? (
          <div>
            <div className="text-small text-ink-500 mb-1">Notes internes</div>
            <p className="text-body text-ink-800 whitespace-pre-wrap italic">{quote.notes}</p>
          </div>
        ) : null}

        <QuoteActions quote={quote} gmailConnected={gmailConnected} invoiceDeleted={invoiceDeleted} />
      </section>

      <section className="surface p-0 overflow-hidden">
        <div className="px-4 py-3 text-small flex items-center justify-between">
          <span className="font-medium text-ink-700">Aperçu PDF</span>
          <a
            className="inline-flex items-center gap-1 text-small font-medium text-brand-600 hover:text-brand-700 transition-colors"
            href={`/api/quotes/${quote.id}/pdf`}
            target="_blank"
            rel="noreferrer"
          >
            Ouvrir <ExternalLink size={14} />
          </a>
        </div>
        <iframe
          src={`/api/quotes/${quote.id}/pdf`}
          title={`Devis ${quote.number}`}
          className="w-full h-[600px] bg-surface-2"
        />
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-ink-500">{label}</div>
      <div className="text-ink-800 font-medium">{children}</div>
    </div>
  );
}

function StatusDot({ status, converted }: { status: string; converted: boolean }) {
  if (converted) {
    return (
      <span className="status-dot paid">
        <span className="d" aria-hidden />
        Converti en facture
      </span>
    );
  }
  const map: Record<string, { cls: string; label: string }> = {
    accepted: { cls: "paid",   label: "Accepté" },
    sent:     { cls: "sent",   label: "Envoyé" },
    draft:    { cls: "draft",  label: "Brouillon" },
    rejected: { cls: "cancel", label: "Refusé" },
    expired:  { cls: "cancel", label: "Expiré" },
  };
  const { cls, label } = map[status] ?? map.draft;
  return (
    <span className={`status-dot ${cls}`}>
      <span className="d" aria-hidden />
      {label}
    </span>
  );
}
