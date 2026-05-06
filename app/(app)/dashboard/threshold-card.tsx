import Link from "next/link";
import { formatEUR } from "@/lib/format";
import {
  thresholdsFor,
  thresholdStatus,
  type ActivityKind,
  type ThresholdStatus,
} from "@/lib/urssaf-thresholds";
import { AlertTriangle, FileSpreadsheet, ShieldCheck, TrendingUp } from "lucide-react";

/**
 * Carte "Seuil annuel URSSAF" — affichée sur le dashboard.
 *
 * Combine deux fonctionnalités du Sprint 4 :
 *
 *   B3 — Le user voit où il en est de son CA annuel cumulé (factures Asthia
 *        + import prior_revenue) et a un lien direct vers /import pour
 *        modifier les chiffres importés.
 *
 *   B5 — Affichage de la barre de progression vers le seuil annuel
 *        applicable (188 700 € vente / 77 700 € service / les deux pour
 *        mixte) avec alerte rouge si > 80 %.
 *
 * Si l'AE n'a pas encore choisi son activity_kind, on n'affiche rien (la
 * carte serait dénuée de sens — le seuil applicable n'est pas connu).
 */

export type ThresholdCardProps = {
  /** Catégorie d'activité du user, depuis profiles.activity_kind. */
  activityKind: ActivityKind;
  /** CA encaissé cumulé pour l'année courante via les factures Asthia (centimes). */
  invoicesCents: number;
  /** CA encaissé cumulé pour l'année courante via prior_revenue (centimes). */
  priorRevenueCents: number;
  /** CA encaissé via prior_revenue PART SERVICES (mixte uniquement). */
  priorRevenueServiceCents?: number;
  /** CA encaissé via factures Asthia, PART SERVICES (mixte uniquement). */
  invoicesServiceCents?: number;
  /** Année affichée. */
  year: number;
  /** True si le user a déjà résolu le modal prior_activity → on affiche un
   *  lien "Modifier" (B3). Sinon, on encourage la première saisie. */
  resolved: boolean;
};

export function ThresholdCard({
  activityKind,
  invoicesCents,
  priorRevenueCents,
  priorRevenueServiceCents = 0,
  invoicesServiceCents = 0,
  year,
  resolved,
}: ThresholdCardProps) {
  const info = thresholdsFor(activityKind);
  const totalCents = invoicesCents + priorRevenueCents;
  const globalStatus = thresholdStatus(totalCents, info.globalCents);
  const ratio = info.globalCents > 0 ? Math.min(1, totalCents / info.globalCents) : 0;

  // En mixte, on calcule aussi le sous-seuil services.
  const isMixed = activityKind === "mixte";
  const serviceTotalCents = invoicesServiceCents + priorRevenueServiceCents;
  const serviceStatus =
    isMixed && info.serviceCents
      ? thresholdStatus(serviceTotalCents, info.serviceCents)
      : null;
  const serviceRatio =
    isMixed && info.serviceCents
      ? Math.min(1, serviceTotalCents / info.serviceCents)
      : 0;

  const showImportedHint = priorRevenueCents > 0 || resolved;

  return (
    <section className="surface p-5 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 grid place-items-center rounded-2xl bg-brand-500/10 text-brand-600">
            <TrendingUp size={16} />
          </div>
          <div>
            <h2 className="text-h3 text-ink-900">Seuil annuel {year}</h2>
            <p className="text-xs text-ink-500">{info.label}</p>
          </div>
        </div>
        <Link
          href="/import"
          className="inline-flex items-center gap-1.5 text-small font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          <FileSpreadsheet size={14} />
          {showImportedHint ? "Modifier l'import" : "Importer du CA passé"}
        </Link>
      </div>

      {/* Barre principale (seuil global) */}
      <ThresholdBar
        label={isMixed ? "Total CA (vente + services)" : "CA cumulé"}
        currentCents={totalCents}
        capCents={info.globalCents}
        ratio={ratio}
        status={globalStatus}
      />

      {/* Sous-barre services (mixte uniquement) */}
      {isMixed && info.serviceCents != null ? (
        <ThresholdBar
          label="Dont prestations de services"
          currentCents={serviceTotalCents}
          capCents={info.serviceCents}
          ratio={serviceRatio}
          status={serviceStatus ?? "ok"}
        />
      ) : null}

      {/* Détail répartition factures vs prior_revenue */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <div className="text-ink-500">Via Asthia</div>
          <div className="text-small font-semibold text-ink-900 tabular-nums mt-0.5">
            {formatEUR(invoicesCents)}
          </div>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <div className="text-ink-500">Importé manuellement</div>
          <div className="text-small font-semibold text-ink-900 tabular-nums mt-0.5">
            {formatEUR(priorRevenueCents)}
          </div>
        </div>
      </div>

      {/* Bandeau d'alerte selon le statut le plus critique */}
      {(globalStatus !== "ok" || serviceStatus === "warn" || serviceStatus === "over") ? (
        <Banner
          status={
            // Le statut affiché est le PIRE entre global et services.
            mostCritical(globalStatus, serviceStatus ?? "ok")
          }
          activityKind={activityKind}
        />
      ) : (
        <div className="flex items-center gap-2 text-xs text-ink-500">
          <ShieldCheck size={14} className="text-success-600" />
          Tu es bien dans le régime micro pour {year}.
        </div>
      )}
    </section>
  );
}

function ThresholdBar({
  label,
  currentCents,
  capCents,
  ratio,
  status,
}: {
  label: string;
  currentCents: number;
  capCents: number;
  ratio: number;
  status: ThresholdStatus;
}) {
  const color =
    status === "over"
      ? "bg-danger-500"
      : status === "warn"
        ? "bg-warn-500"
        : status === "watch"
          ? "bg-brand-500"
          : "bg-success-500";

  return (
    <div>
      <div className="flex items-baseline justify-between text-xs text-ink-500 mb-1.5">
        <span>{label}</span>
        <span className="tabular-nums">
          <strong className="text-ink-900">{formatEUR(currentCents)}</strong>
          <span className="text-ink-400"> / {formatEUR(capCents)}</span>
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-surface-2 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${Math.max(2, ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

function Banner({
  status,
  activityKind,
}: {
  status: ThresholdStatus;
  activityKind: ActivityKind;
}) {
  const labelByKind: Record<ActivityKind, string> = {
    vente: "vente",
    service_bic: "services BIC",
    liberal_bnc: "activité libérale",
    mixte: "activité mixte",
  };
  if (status === "over") {
    return (
      <div className="rounded-xl bg-danger-500/10 border border-danger-500/30 p-3 flex items-start gap-2 text-small text-danger-600">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <div>
          <strong>Seuil annuel dépassé</strong> — tu sortiras du régime micro
          en {nextYear()}. Anticipe le passage en BIC/BNC réel.
        </div>
      </div>
    );
  }
  if (status === "warn") {
    return (
      <div className="rounded-xl bg-warn-500/10 border border-warn-500/30 p-3 flex items-start gap-2 text-small text-warn-600">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
        <div>
          Tu approches du seuil de ton {labelByKind[activityKind]} — surveille
          ton CA pour ne pas basculer hors du régime micro.
        </div>
      </div>
    );
  }
  // "watch"
  return (
    <div className="rounded-xl bg-brand-500/8 border border-brand-500/20 p-3 flex items-start gap-2 text-small text-brand-700">
      <TrendingUp size={16} className="shrink-0 mt-0.5" />
      <div>Tu as dépassé 60 % du seuil annuel — tout va bien, on te tient au courant.</div>
    </div>
  );
}

/** Renvoie le statut le plus critique entre deux. */
function mostCritical(a: ThresholdStatus, b: ThresholdStatus): ThresholdStatus {
  const rank: Record<ThresholdStatus, number> = { ok: 0, watch: 1, warn: 2, over: 3 };
  return rank[a] >= rank[b] ? a : b;
}

function nextYear(): number {
  return new Date().getFullYear() + 1;
}
