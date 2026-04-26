import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { ImportRevenueForm } from "./form";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Assistant d'import du CA déjà encaissé cette année.
 *
 * Server Component — charge les paramètres du profil (catégorie d'activité
 * et fréquence URSSAF), construit la liste des PÉRIODES PASSÉES depuis le
 * 1er janvier jusqu'à aujourd'hui exclus (on n'importe pas la période en
 * cours, elle est déjà alimentée par les vraies factures), et précharge
 * les saisies déjà effectuées (pour permettre de revenir éditer).
 *
 * Le form client en aval (ImportRevenueForm) gère la grille de saisie et
 * l'upsert vers la table prior_revenue.
 */
export default async function ImportPage() {
  const supabase = createClient();
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("activity_kind, urssaf_frequency, prior_activity_resolved")
    .eq("id", user.id)
    .maybeSingle();

  // Si l'user n'a pas encore choisi sa catégorie d'activité (cas où il
  // arrive ici sans passer par l'onboarding), on le renvoie au paramétrage.
  if (!profile?.activity_kind) {
    return (
      <div className="max-w-xl mx-auto">
        <BackLink />
        <div className="surface p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto h-14 w-14 grid place-items-center rounded-full bg-warn-500/10 text-warn-700">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h1 className="text-h2 text-ink-900">Renseigne d&apos;abord ton activité</h1>
            <p className="mt-2 text-small text-ink-500">
              Pour pré-remplir la grille avec les bonnes catégories, on a besoin
              que tu choisisses d&apos;abord ta catégorie d&apos;activité dans tes paramètres.
            </p>
          </div>
          <Link href="/settings" className="pill pill-primary">
            Aller aux paramètres
          </Link>
        </div>
      </div>
    );
  }

  // Construction des périodes à saisir depuis le 1er janvier de l'année
  // courante jusqu'à la dernière période entièrement écoulée.
  const now = new Date();
  const year = now.getFullYear();
  const periods = buildPastPeriods(now, profile.urssaf_frequency as "monthly" | "quarterly");

  // Précharge des entrées déjà saisies. Si l'user revient sur la page
  // pour modifier, le form les affiche en valeur initiale.
  const { data: existing } = await supabase
    .from("prior_revenue")
    .select("period_year, period_month, activity_kind, amount_cents")
    .eq("user_id", user.id)
    .eq("period_year", year);

  return (
    <div className="max-w-3xl mx-auto">
      <BackLink />
      <div className="space-y-6">
        <div>
          <h1 className="text-h1">Importe ton CA encaissé cette année</h1>
          <p className="mt-2 text-small text-ink-500">
            Saisis ce que tu as déjà encaissé depuis le 1<sup>er</sup> janvier {year}.
            Cela sert à calculer correctement tes seuils annuels et à éviter de te
            retrouver à devoir tout ressaisir manuellement. Tu peux revenir
            modifier ces chiffres plus tard.
          </p>
        </div>
        <ImportRevenueForm
          year={year}
          activityKind={profile.activity_kind as "vente" | "service_bic" | "liberal_bnc" | "mixte"}
          frequency={profile.urssaf_frequency as "monthly" | "quarterly"}
          periods={periods}
          existing={existing ?? []}
          alreadyResolved={Boolean(profile.prior_activity_resolved)}
        />
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <div className="mb-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-small text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={14} />
        Retour au dashboard
      </Link>
    </div>
  );
}

/**
 * Construit la liste des périodes passées de l'année courante.
 * - Mensuel : tous les mois de janvier jusqu'au mois précédent inclus.
 * - Trimestriel : tous les trimestres entièrement écoulés.
 * On ne propose pas de saisir la période en cours : elle est déjà alimentée
 * par les vraies factures émises dans l'app.
 *
 * Renvoie un tableau de { month: 1-12, label: "Janvier 2026" } trié
 * du plus ancien au plus récent.
 */
function buildPastPeriods(
  now: Date,
  frequency: "monthly" | "quarterly",
): { month: number; label: string }[] {
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  if (frequency === "monthly") {
    const out: { month: number; label: string }[] = [];
    for (let m = 1; m < currentMonth; m++) {
      out.push({ month: m, label: monthLabel(m, year) });
    }
    return out;
  }

  // Trimestriel : T1 = mois 1-3, T2 = 4-6, T3 = 7-9, T4 = 10-12.
  // Un trimestre est "entièrement écoulé" si son dernier mois est < mois en cours.
  const out: { month: number; label: string }[] = [];
  const trimesters = [
    { start: 1, end: 3, label: `T1 ${year} (jan–mars)` },
    { start: 4, end: 6, label: `T2 ${year} (avr–juin)` },
    { start: 7, end: 9, label: `T3 ${year} (juil–sept)` },
    { start: 10, end: 12, label: `T4 ${year} (oct–déc)` },
  ];
  for (const t of trimesters) {
    if (t.end < currentMonth) {
      out.push({ month: t.start, label: t.label });
    }
  }
  return out;
}

function monthLabel(month: number, year: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
