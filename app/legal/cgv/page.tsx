import {
  LEGAL_NAME,
  TRADE_NAME,
  SIREN,
  SIRET,
  ADDRESS_LINE_1,
  POSTAL_CODE,
  CITY,
  COUNTRY,
  CONTACT_EMAIL,
  SITE_URL,
  LAST_UPDATED,
} from "@/lib/legal-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente — Asthia",
  description:
    "Conditions générales de vente du service Asthia : tarifs, modalités de paiement, droit de rétractation et résiliation.",
};

/**
 * Conditions Générales de Vente (CGV).
 *
 * Le service est aujourd'hui GRATUIT en phase de lancement (cf. CGU §7).
 * Cette CGV est volontairement courte mais cadre déjà :
 *  - le caractère gratuit du Service à ce jour,
 *  - les modalités de basculement vers un modèle payant (préavis 30j),
 *  - le futur droit de rétractation pour les consommateurs,
 *  - la médiation de la consommation.
 *
 * Document distinct des CGU pour répondre à l'exigence URSSAF
 * (API Tierce Déclaration Auto-Entrepreneur — courrier du 30/04/2026)
 * qui demande la présence à la fois de CGU ET de CGV.
 */
export default function CGV() {
  return (
    <article className="prose-legal">
      <h1 className="text-h1 mb-2">Conditions Générales de Vente</h1>
      <p className="text-small text-ink-500 mb-8">
        Dernière mise à jour : {LAST_UPDATED}
      </p>

      <Section title="1. Préambule">
        <p>
          Les présentes Conditions Générales de Vente (ci-après &laquo;&nbsp;CGV&nbsp;&raquo;)
          s&apos;appliquent à toute souscription au Service {TRADE_NAME},
          accessible à l&apos;adresse {SITE_URL}, édité par&nbsp;:
        </p>
        <ul>
          <li>{LEGAL_NAME} ({TRADE_NAME})</li>
          <li>SIREN&nbsp;: {SIREN} — SIRET&nbsp;: {SIRET}</li>
          <li>{ADDRESS_LINE_1}, {POSTAL_CODE} {CITY}, {COUNTRY}</li>
          <li>
            Email&nbsp;: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </li>
        </ul>
        <p>
          Les présentes CGV complètent les{" "}
          <a href="/legal/cgu" className="text-brand-600 underline">
            Conditions Générales d&apos;Utilisation
          </a>{" "}
          du Service. En cas de contradiction, les présentes CGV prévalent
          sur les CGU pour les seules clauses relatives à la vente.
        </p>
      </Section>

      <Section title="2. Description du service">
        <p>
          {TRADE_NAME} est un service en ligne (SaaS) destiné aux travailleurs
          indépendants relevant du régime du micro-entrepreneur en France. Il
          permet notamment l&apos;émission de factures et devis, la gestion
          d&apos;un carnet clients, le calcul et la pré-saisie des
          déclarations URSSAF, et l&apos;export comptable.
        </p>
        <p>
          La description fonctionnelle complète du Service figure dans les CGU
          (article 5).
        </p>
      </Section>

      <Section title="3. Tarifs">
        <p>
          <strong>Le Service est proposé gratuitement</strong> pendant la
          phase de lancement, sans engagement de durée et sans demande
          d&apos;informations bancaires à l&apos;inscription.
        </p>
        <p>
          {LEGAL_NAME} se réserve le droit de faire évoluer le Service vers un
          modèle payant (abonnement mensuel ou annuel). Tout passage à un
          modèle payant fera l&apos;objet d&apos;une notification préalable
          par email <strong>au moins 30 jours</strong> avant l&apos;entrée en
          vigueur des nouvelles conditions tarifaires.
        </p>
        <p>
          L&apos;utilisateur conservera la faculté de refuser les nouvelles
          conditions et de résilier son compte sans frais ni justification
          pendant ce préavis. <strong>Aucun prélèvement ne sera effectué
          sans accord explicite et préalable de l&apos;utilisateur.</strong>
        </p>
      </Section>

      <Section title="4. Modalités de paiement (futures)">
        <p>
          Lorsque le Service deviendra payant, les paiements s&apos;effectueront
          par carte bancaire via un prestataire de paiement sécurisé
          (PCI-DSS). L&apos;abonnement sera prélevé d&apos;avance, par
          échéances mensuelles ou annuelles selon la formule choisie, et se
          renouvellera tacitement sauf résiliation notifiée avant
          l&apos;échéance.
        </p>
        <p>
          Une facture sera émise et mise à disposition dans l&apos;espace
          utilisateur après chaque prélèvement.
        </p>
      </Section>

      <Section title="5. Droit de rétractation">
        <p>
          Conformément à l&apos;article L.221-18 du Code de la consommation,
          l&apos;utilisateur consommateur dispose d&apos;un délai de
          <strong> 14 jours </strong>à compter de la souscription d&apos;un
          abonnement payant pour exercer son droit de rétractation, sans avoir
          à justifier de motif ni à payer de pénalité.
        </p>
        <p>
          Toutefois, en application de l&apos;article L.221-28 1° du même code,
          si l&apos;utilisateur demande expressément à bénéficier du Service
          avant la fin du délai de rétractation, il sera redevable d&apos;un
          montant correspondant au service fourni jusqu&apos;à la communication
          de sa décision de se rétracter.
        </p>
        <p>
          Le présent article ne s&apos;applique pas aux utilisateurs
          professionnels (commerçants, artisans, libéraux, micro-entrepreneurs)
          souscrivant pour les besoins de leur activité, conformément à
          l&apos;article L.221-3 du Code de la consommation.
        </p>
      </Section>

      <Section title="6. Résiliation">
        <p>
          L&apos;utilisateur peut résilier son abonnement à tout moment depuis
          l&apos;interface du Service ou en envoyant un email à
          {" "}<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. La
          résiliation prend effet à la fin de la période en cours déjà payée
          (pas de remboursement au prorata).
        </p>
        <p>
          {LEGAL_NAME} se réserve le droit de suspendre ou de résilier
          l&apos;abonnement en cas de non-paiement, après mise en demeure
          restée infructueuse pendant 15 jours.
        </p>
      </Section>

      <Section title="7. Garantie légale et responsabilité">
        <p>
          {LEGAL_NAME} met en œuvre les meilleurs efforts pour assurer la
          disponibilité, la fiabilité et la sécurité du Service. Les limites
          de responsabilité sont décrites à l&apos;article 6 des CGU et
          s&apos;appliquent intégralement aux présentes CGV.
        </p>
        <p>
          Le consommateur bénéficie de la garantie légale de conformité
          (art. L.217-3 et suivants du Code de la consommation) ainsi que de
          la garantie contre les vices cachés (art. 1641 et suivants du Code
          civil), dans les conditions prévues par la loi.
        </p>
      </Section>

      <Section title="8. Réclamations et médiation">
        <p>
          Toute réclamation peut être adressée à {LEGAL_NAME} à
          l&apos;adresse{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. {LEGAL_NAME}
          {" "}s&apos;engage à y répondre dans un délai raisonnable.
        </p>
        <p>
          Conformément à l&apos;article L.612-1 du Code de la consommation,
          tout consommateur a le droit de recourir gratuitement à un médiateur
          de la consommation en vue de la résolution amiable d&apos;un litige
          l&apos;opposant à un professionnel.
        </p>
      </Section>

      <Section title="9. Données personnelles">
        <p>
          Les modalités de collecte et de traitement des données personnelles
          dans le cadre de l&apos;exécution des présentes CGV sont décrites
          dans la{" "}
          <a href="/legal/confidentialite" className="text-brand-600 underline">
            Politique de confidentialité
          </a>.
        </p>
      </Section>

      <Section title="10. Droit applicable et juridiction">
        <p>
          Les présentes CGV sont régies par le droit français. En cas de
          litige, et après recherche d&apos;une solution amiable, les
          tribunaux français seront seuls compétents, sous réserve des règles
          impératives de protection du consommateur lui permettant de saisir
          la juridiction de son lieu de domicile.
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return (
    <section id={id} className="mb-7">
      <h2 className="text-h3 text-ink-900 mb-2">{title}</h2>
      <div className="space-y-3 text-body text-ink-700 leading-relaxed [&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:pl-2">
        {children}
      </div>
    </section>
  );
}
