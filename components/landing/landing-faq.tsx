"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

/**
 * FAQ landing — accordéon façon claude.ai : titre centré, liste de
 * questions séparées par des traits, clic sur une question pour dérouler
 * sa réponse. Une seule question ouverte à la fois ; au chargement,
 * toutes sont fermées.
 *
 * Volontairement 3 questions seulement — celles qui lèvent les 3 plus
 * gros freins avant inscription :
 *   1. la déclaration URSSAF est-elle réellement automatique,
 *   2. la sécurité des données / factures,
 *   3. ce qui change quand le service deviendra payant en 2027.
 *
 * L'animation d'ouverture utilise grid-template-rows 0fr → 1fr : c'est
 * la technique CSS qui anime proprement une hauteur "auto" inconnue,
 * sans calcul JS de max-height.
 */
const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "Asthia déclare-t-il vraiment mon chiffre d'affaires à l'URSSAF à ma place ?",
    a: "Oui. Chaque mois, à la date que tu choisis, Asthia calcule ton chiffre d'affaires encaissé le mois précédent et transmet ta déclaration à l'URSSAF automatiquement — rien à ressaisir, rien à oublier. Tu retrouves l'historique de toutes tes déclarations et leur statut dans ton espace. Et si tu as encaissé du chiffre d'affaires avant d'utiliser Asthia, tu peux l'importer pour qu'il soit pris en compte.",
  },
  {
    q: "Mes factures et mes données sont-elles en sécurité ?",
    a: "Tes données sont chiffrées et hébergées sur des serveurs situés en Europe, dans le respect du RGPD. Tu restes propriétaire de tes factures : à tout moment tu peux les exporter en Excel ou en PDF et les conserver, même si tu quittes Asthia. Nous ne revendons aucune donnée.",
  },
  {
    q: "Asthia est gratuit aujourd'hui — qu'est-ce qui change au 1ᵉʳ janvier 2027 ?",
    a: "Asthia est 100 % gratuit jusqu'au 31 décembre 2026. À partir du 1ᵉʳ janvier 2027, le service passera à 2 € par mois, le premier mois étant offert. Pas de prélèvement surprise : tu seras prévenu·e à l'avance et tu resteras libre de continuer ou non. Dans tous les cas, tes factures et ton historique restent accessibles.",
  },
];

export function LandingFaq() {
  // null = tout fermé. Au chargement, toutes les questions sont fermées :
  // le visiteur ouvre uniquement ce qui l'intéresse.
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section
      id="faq"
      className="px-5 md:px-8 max-w-3xl mx-auto w-full pb-16 md:pb-24"
    >
      <h2 className="text-h1 md:text-display font-bold tracking-tight text-ink-900 text-center mb-8 md:mb-10">
        Questions fréquentes
      </h2>

      {/* L'accordéon entier dans une seule carte blanche — cohérent avec
          les cards de pricing au-dessus. Les questions sont séparées par
          un simple trait (border-t à partir de la 2ᵉ). */}
      <div className="surface px-5 md:px-7">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className={i > 0 ? "border-t border-divider" : ""}
            >
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span className="text-h3 md:text-h2 font-semibold text-ink-900">
                    {item.q}
                  </span>
                  {/* Plus pivoté à 45° quand ouvert → devient une croix. */}
                  <span
                    className={
                      "shrink-0 grid place-items-center h-8 w-8 rounded-full bg-surface-2 text-ink-500 transition-all duration-300 group-hover:bg-brand-500/10 group-hover:text-brand-600 " +
                      (isOpen ? "rotate-45 text-brand-600" : "")
                    }
                    aria-hidden
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                </button>
              </h3>

              {/* Conteneur animé : grid-rows 0fr → 1fr. L'enfant doit être
                  en overflow-hidden pour que le contenu soit "coupé"
                  pendant la transition. */}
              <div
                className={
                  "grid transition-[grid-template-rows] duration-300 ease-out " +
                  (isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
                }
              >
                <div className="overflow-hidden">
                  <p className="pb-5 -mt-1 text-body text-ink-600">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
