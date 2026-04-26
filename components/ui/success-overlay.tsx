"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

/**
 * Modal de confirmation universelle après une création réussie (facture,
 * devis, client, etc.). Pattern repris à l'identique de ce qui existait dans
 * invoices/new/form.tsx pour garantir l'uniformité visuelle entre tous les
 * modules — l'utilisateur voit toujours le MÊME look après une action de
 * création.
 *
 * Visual : overlay sombre + blur, modal blanc centré, gros badge bleu avec
 * check qui anime de scale-0 à scale-100 (30ms après mount), titre +
 * sous-titre, liste de rows clés-valeurs, bouton primaire en bas.
 *
 * Pas de bouton "Annuler" / "Fermer" volontairement — le seul chemin de
 * sortie est le CTA (ce qui force une navigation cohérente vers la page
 * détail de l'entité créée).
 */
export type SuccessRow = {
  label: string;
  value: string;
  /** Sous-texte optionnel (ex: email sous le nom du client). */
  sub?: string;
};

export function SuccessOverlay({
  title,
  subtitle,
  rows,
  cta,
}: {
  title: string;
  /** Petit texte gris sous le titre, typiquement "N° F-2026-0001". */
  subtitle?: string;
  rows: SuccessRow[];
  /** Bouton primaire en bas. Gère la fermeture du modal (généralement une
   *  navigation vers la page détail de l'entité créée). */
  cta: {
    label: string;
    onClick: () => void;
  };
}) {
  // Animation d'entrée du badge check : on attend 30ms après le mount pour
  // déclencher la transition scale-0 → scale-100. Sans ce délai, React
  // applique tout de suite le style final et on voit pas l'animation.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-title"
      className="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 backdrop-blur-sm p-4 animate-fade-in"
    >
      <div className="w-full max-w-md surface p-6 md:p-8 text-center">
        <div
          className={
            "mx-auto grid h-20 w-20 md:h-24 md:w-24 place-items-center rounded-full bg-brand-500 text-white shadow-pop transition-transform duration-500 " +
            (mounted ? "scale-100" : "scale-0")
          }
          style={{ transitionTimingFunction: "cubic-bezier(.34,1.56,.64,1)" }}
        >
          <Check size={48} strokeWidth={3} />
        </div>
        <h2 id="success-title" className="mt-5 text-h2 text-ink-900">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 text-small text-ink-500">{subtitle}</p> : null}

        <div className="mt-6 text-left rounded-2xl bg-surface-2 p-4 divide-y divide-divider">
          {rows.map((r, i) => (
            <SuccessOverlayRow key={i} label={r.label} value={r.value} sub={r.sub} />
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={cta.onClick}>
            {cta.label} <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuccessOverlayRow({ label, value, sub }: SuccessRow) {
  return (
    <div className="flex items-start justify-between gap-3 text-small py-2 first:pt-0 last:pb-0">
      <span className="text-ink-500">{label}</span>
      <span className="text-right text-ink-900 font-medium min-w-0 flex-1 break-words">
        {value}
        {sub ? (
          <span className="block text-xs text-ink-500 font-normal break-all">{sub}</span>
        ) : null}
      </span>
    </div>
  );
}
