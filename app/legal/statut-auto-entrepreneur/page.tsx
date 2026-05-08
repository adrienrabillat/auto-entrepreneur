import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Statut auto-entrepreneur — Asthia",
  description:
    "L'essentiel du statut auto-entrepreneur : création, spécificités, cotisations obligatoires, droit du travail. Référentiel officiel URSSAF.",
};

/**
 * Page d'information sur le statut auto-entrepreneur.
 *
 * Exigée par l'URSSAF pour les partenaires de l'API TDAE (Tierce
 * Déclaration Auto-Entrepreneur). Couvre :
 *  - Création du statut + spécificités
 *  - Caractère obligatoire des cotisations
 *  - Rôle des cotisations
 *  - Articulation avec le droit du travail (salariat / indépendant)
 *
 * On garde un format synthétique côté Asthia et on renvoie vers
 * `autoentrepreneur.urssaf.fr` (référentiel officiel) pour le détail.
 * Conforme à l'option 2 proposée par l'URSSAF dans le processus de
 * partenariat TDAE.
 */
export default function StatutAutoEntrepreneurPage() {
  return (
    <div>
      <h1 className="text-h1 mb-2">Le statut auto-entrepreneur</h1>
      <p className="text-body text-ink-500 mb-8">
        L&apos;essentiel à savoir avant de démarrer ou pendant l&apos;exercice
        de ton activité d&apos;auto-entrepreneur (officiellement appelé
        micro-entrepreneur depuis 2016).
      </p>

      <div className="surface p-4 mb-8 flex items-start gap-3 bg-brand-500/5">
        <Info size={18} className="text-brand-600 shrink-0 mt-0.5" />
        <p className="text-small text-ink-700 leading-relaxed">
          Cette page est un résumé pédagogique. Pour le référentiel officiel,
          complet et tenu à jour, rendez-vous sur le site URSSAF dédié :{" "}
          <a
            href="https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut.html"
            target="_blank"
            rel="noreferrer"
            className="text-brand-600 underline font-medium inline-flex items-center gap-1"
          >
            L&apos;essentiel du statut — autoentrepreneur.urssaf.fr
            <ExternalLink size={12} />
          </a>
          .
        </p>
      </div>

      <Section title="1. Création du statut">
        <p>
          Le statut d&apos;auto-entrepreneur est un régime simplifié de la
          micro-entreprise. La déclaration de début d&apos;activité s&apos;effectue
          gratuitement sur le{" "}
          <a
            className="text-brand-600 underline"
            href="https://procedures.inpi.fr/?/"
            target="_blank"
            rel="noreferrer"
          >
            Guichet unique INPI
          </a>{" "}
          (qui remplace depuis 2023 le portail autoentrepreneur.urssaf.fr pour
          la création).
        </p>
        <p>
          Une fois le numéro SIREN attribué, l&apos;auto-entrepreneur est
          immatriculé au Répertoire National des Entreprises et peut commencer
          à facturer. Plus de détails :{" "}
          <a
            className="text-brand-600 underline"
            href="https://www.autoentrepreneur.urssaf.fr/portail/accueil/creer-mon-auto-entreprise.html"
            target="_blank"
            rel="noreferrer"
          >
            Créer mon auto-entreprise sur autoentrepreneur.urssaf.fr
          </a>
          .
        </p>
      </Section>

      <Section title="2. Spécificités du statut">
        <ul className="list-disc pl-5 space-y-2 marker:text-ink-400">
          <li>
            <strong className="text-ink-900">Plafonds de chiffre d&apos;affaires (2026) :</strong>{" "}
            188 700 € HT/an pour les activités de vente de marchandises et
            d&apos;hébergement, 77 700 € HT/an pour les prestations de
            services et professions libérales. Au-delà sur deux années
            consécutives, sortie automatique du régime.
          </li>
          <li>
            <strong className="text-ink-900">Franchise en base de TVA :</strong>{" "}
            tant que les seuils de TVA sont respectés, l&apos;auto-entrepreneur
            n&apos;applique pas de TVA et porte la mention obligatoire{" "}
            <em>« TVA non applicable, art. 293 B du CGI »</em> sur ses
            factures.
          </li>
          <li>
            <strong className="text-ink-900">Régime micro-fiscal :</strong>{" "}
            l&apos;impôt sur le revenu est calculé sur le chiffre
            d&apos;affaires (avec un abattement forfaitaire pour frais
            professionnels). Option possible pour le versement libératoire
            sous conditions de revenu fiscal de référence.
          </li>
          <li>
            <strong className="text-ink-900">Cumul d&apos;activités :</strong>{" "}
            le statut est cumulable avec un emploi salarié, une retraite, des
            études ou des allocations chômage, sous certaines conditions.
          </li>
          <li>
            <strong className="text-ink-900">Régime social spécifique :</strong>{" "}
            l&apos;auto-entrepreneur relève du régime général de la Sécurité
            sociale des indépendants, géré par l&apos;URSSAF.
          </li>
        </ul>
        <p className="mt-3">
          <a
            className="text-brand-600 underline inline-flex items-center gap-1"
            href="https://www.autoentrepreneur.urssaf.fr/portail/accueil/sinformer-sur-le-statut/lessentiel-du-statut.html"
            target="_blank"
            rel="noreferrer"
          >
            Toutes les spécificités sur autoentrepreneur.urssaf.fr
            <ExternalLink size={12} />
          </a>
        </p>
      </Section>

      <Section title="3. Caractère obligatoire des cotisations sociales">
        <p>
          <strong className="text-ink-900">
            Le paiement des cotisations sociales est une obligation légale.
          </strong>{" "}
          Tout auto-entrepreneur déclarant un chiffre d&apos;affaires DOIT
          payer les cotisations correspondantes à l&apos;URSSAF, calculées en
          pourcentage de son chiffre d&apos;affaires, selon la nature de son
          activité.
        </p>
        <p>
          La déclaration et le paiement s&apos;effectuent mensuellement ou
          trimestriellement (au choix) via le portail{" "}
          <a
            className="text-brand-600 underline"
            href="https://www.autoentrepreneur.urssaf.fr/"
            target="_blank"
            rel="noreferrer"
          >
            autoentrepreneur.urssaf.fr
          </a>
          {" "}ou via une plateforme tierce partenaire de l&apos;API TDAE comme
          Asthia.
        </p>
        <p>
          <strong className="text-ink-900">Sanctions en cas de non-paiement :</strong>{" "}
          majorations de retard, mises en demeure, perte du droit aux
          prestations sociales (couverture santé, validation de trimestres
          retraite, etc.) et poursuites possibles en cas de fraude.
        </p>
      </Section>

      <Section title="4. Rôle des cotisations sociales">
        <p>
          Les cotisations sociales financent la protection sociale de
          l&apos;auto-entrepreneur. En contrepartie de leur paiement,
          l&apos;auto-entrepreneur bénéficie de :
        </p>
        <ul className="list-disc pl-5 space-y-2 marker:text-ink-400">
          <li>
            <strong className="text-ink-900">L&apos;assurance maladie-maternité :</strong>{" "}
            remboursement des soins, indemnités journalières, prestations
            maternité.
          </li>
          <li>
            <strong className="text-ink-900">L&apos;assurance retraite :</strong>{" "}
            validation de trimestres et constitution de droits à la retraite
            de base et complémentaire.
          </li>
          <li>
            <strong className="text-ink-900">Les allocations familiales</strong>{" "}
            (aides à la famille, prestations sociales).
          </li>
          <li>
            <strong className="text-ink-900">La formation professionnelle :</strong>{" "}
            droit à la formation continue (CPF), accès à des financements de
            formation via les Fonds d&apos;assurance formation (FAF).
          </li>
          <li>
            <strong className="text-ink-900">La CSG / CRDS :</strong>{" "}
            contribution au financement de la sécurité sociale et à
            l&apos;amortissement de la dette sociale.
          </li>
        </ul>
        <p className="mt-3">
          <a
            className="text-brand-600 underline inline-flex items-center gap-1"
            href="https://www.autoentrepreneur.urssaf.fr/portail/accueil/cotisations-et-impots/quelles-cotisations.html"
            target="_blank"
            rel="noreferrer"
          >
            Détail des cotisations et taux 2026 sur autoentrepreneur.urssaf.fr
            <ExternalLink size={12} />
          </a>
        </p>
      </Section>

      <Section title="5. Le statut auto-entrepreneur et le droit du travail">
        <p>
          L&apos;auto-entrepreneur est un{" "}
          <strong className="text-ink-900">travailleur indépendant</strong> : il
          n&apos;est pas salarié et n&apos;est donc pas soumis au Code du
          travail dans sa relation avec ses clients. Il fixe librement ses
          tarifs, ses horaires, et choisit ses missions.
        </p>
        <p>
          <strong className="text-ink-900">Risque de requalification :</strong>{" "}
          si la relation entre un auto-entrepreneur et un donneur d&apos;ordre
          présente les caractéristiques d&apos;un contrat de travail (lien de
          subordination, exclusivité, intégration au service organisé), elle
          peut être requalifiée par les juridictions prud&apos;homales en
          contrat de travail salarié. C&apos;est l&apos;une des principales
          dérives du statut, surveillée par l&apos;URSSAF et l&apos;Inspection
          du travail.
        </p>
        <p>
          <strong className="text-ink-900">Cumul salariat + auto-entrepreneur :</strong>{" "}
          un salarié peut exercer en parallèle une activité d&apos;auto-
          entrepreneur, sous réserve de respecter une éventuelle clause
          d&apos;exclusivité de son contrat de travail, et de ne pas exercer
          d&apos;activité concurrente à celle de son employeur.
        </p>
        <p>
          <strong className="text-ink-900">Protection sociale réduite :</strong>{" "}
          contrairement au salariat, l&apos;auto-entrepreneur ne cotise pas à
          l&apos;assurance chômage et bénéficie d&apos;une protection sociale
          plus limitée (indemnités journalières conditionnées, congés payés
          inexistants, protection accident du travail spécifique).
        </p>
        <p>
          <a
            className="text-brand-600 underline inline-flex items-center gap-1"
            href="https://www.service-public.fr/professionnels-entreprises/vosdroits/F23961"
            target="_blank"
            rel="noreferrer"
          >
            Droit du travail et micro-entreprise sur service-public.fr
            <ExternalLink size={12} />
          </a>
        </p>
      </Section>

      <Section title="6. Pour aller plus loin">
        <p>
          Asthia est un outil pratique pour facturer, déclarer ton chiffre
          d&apos;affaires à l&apos;URSSAF (via l&apos;API TDAE) et suivre ton
          activité. Asthia n&apos;est pas un cabinet comptable et ne se
          substitue pas à un conseil professionnel personnalisé.
        </p>
        <p>
          Pour toute question sur le statut, tes droits et tes obligations,
          les sources officielles à privilégier sont :
        </p>
        <ul className="list-disc pl-5 space-y-1 marker:text-ink-400">
          <li>
            <a
              className="text-brand-600 underline"
              href="https://www.autoentrepreneur.urssaf.fr/"
              target="_blank"
              rel="noreferrer"
            >
              autoentrepreneur.urssaf.fr
            </a>{" "}
            — Portail officiel URSSAF dédié
          </li>
          <li>
            <a
              className="text-brand-600 underline"
              href="https://entreprendre.service-public.fr/"
              target="_blank"
              rel="noreferrer"
            >
              entreprendre.service-public.fr
            </a>{" "}
            — Service public officiel de l&apos;administration française
          </li>
          <li>
            <a
              className="text-brand-600 underline"
              href="https://procedures.inpi.fr/"
              target="_blank"
              rel="noreferrer"
            >
              procedures.inpi.fr
            </a>{" "}
            — Guichet unique de création d&apos;entreprise
          </li>
        </ul>
      </Section>

      <div className="mt-8 pt-6 border-t border-ink-100">
        <Link
          href="/legal"
          className="text-small text-brand-600 hover:underline"
        >
          ← Retour aux informations légales
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-h2 mb-3">{title}</h2>
      <div className="space-y-3 text-body text-ink-700 leading-relaxed">{children}</div>
    </section>
  );
}
