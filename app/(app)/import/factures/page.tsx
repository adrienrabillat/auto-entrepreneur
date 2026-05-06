import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { formatDate, formatEUR } from "@/lib/format";
import { ImportFacturesForm } from "./form";
import { ArrowLeft, FileSpreadsheet, Repeat } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Page /import/factures — import en masse de factures historiques venant
 * d'un autre logiciel (Henrri, Tiime, etc.).
 *
 * Affiche :
 *  - Documentation du format CSV/XLSX attendu
 *  - Composant client d'upload + preview + confirmation (form.tsx)
 *  - Liste des imports déjà effectués (factures imported=true) pour
 *    permettre de vérifier ce qui est en base.
 */
export default async function ImportFacturesPage() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/");

  // Charger les factures déjà importées pour stats et récap.
  const { data: existing } = await supabase
    .from("invoices")
    .select("id, number, issued_on, amount_cents, client_email, import_source, imported_at")
    .eq("user_id", user.id)
    .eq("imported", true)
    .order("issued_on", { ascending: false })
    .limit(100);

  const importedRows = existing ?? [];
  const totalImported = importedRows.reduce((s, r) => s + (r.amount_cents as number), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div>
        <Link
          href="/import"
          className="inline-flex items-center gap-1.5 text-small text-ink-500 hover:text-ink-900 transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          Retour à l&apos;import du CA mensuel
        </Link>

        <h1 className="text-h1">Importer mes factures historiques</h1>
        <p className="mt-2 text-small text-ink-500">
          Si tu changes de logiciel pour Asthia, tu peux rapatrier ton
          historique de factures pour avoir une vue continue. Ces factures
          sont marquées comme <strong>importées</strong> et :
        </p>
        <ul className="mt-2 text-small text-ink-500 list-disc list-inside space-y-0.5">
          <li>Conservent leur numéro de l&apos;ancien logiciel (pas de re-numérotation)</li>
          <li>Sont visibles dans la liste, l&apos;export Excel, et comptent dans le seuil annuel</li>
          <li>NE seront PAS re-déclarées à l&apos;URSSAF (pour éviter les doublons)</li>
          <li>Sont figées en lecture (pas d&apos;envoi email, pas de modification)</li>
        </ul>
      </div>

      <section className="surface p-5 md:p-6">
        <h2 className="text-h3 mb-3 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-brand-600" />
          Format attendu
        </h2>
        <p className="text-small text-ink-500 mb-3">
          CSV (séparateur virgule ou point-virgule) ou XLSX. La première ligne contient les en-têtes.
        </p>
        <div className="rounded-xl bg-surface-2 p-3 font-mono text-xs overflow-x-auto whitespace-pre">
{`numero,date_emission,date_encaissement,client_email,client_name,description,montant_ht,statut
F-2024-0042,15/03/2024,02/04/2024,client@exemple.fr,Jean Dupont,Coaching mars,1500,paid
F-2024-0043,28/03/2024,,autre@exemple.fr,Acme SAS,Audit conseil,800,sent`}
        </div>
        <p className="mt-3 text-xs text-ink-500">
          Colonnes obligatoires : <strong>numero, date_emission, client_email, description, montant_ht</strong>.
          Optionnelles : <strong>date_encaissement, client_name, statut, operation_type</strong>.
        </p>
      </section>

      <ImportFacturesForm />

      {importedRows.length > 0 ? (
        <section className="surface p-2">
          <div className="flex items-center justify-between px-4 pt-3 pb-2 flex-wrap gap-2">
            <h2 className="text-h3 flex items-center gap-2">
              <Repeat size={16} className="text-ink-500" />
              Déjà importées
            </h2>
            <span className="text-small text-ink-500 tabular-nums">
              {importedRows.length} factures · {formatEUR(totalImported)}
            </span>
          </div>
          <ul className="pb-1">
            {importedRows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-[1fr_auto] gap-3 items-center px-3.5 py-2.5 rounded-2xl"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-ink-900 tabular-nums">{r.number}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 text-brand-700 px-2 py-0.5 text-[11px] font-semibold">
                      Importée
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-500 truncate">
                    {r.client_email} · {formatDate(r.issued_on as string)}
                    {r.import_source ? ` · source : ${r.import_source}` : ""}
                  </div>
                </div>
                <div className="text-body font-bold tabular-nums tracking-tight text-ink-900">
                  {formatEUR(r.amount_cents as number)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
