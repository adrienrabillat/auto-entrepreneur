import {
  LEGAL_NAME,
  TRADE_NAME,
  LEGAL_FORM,
  SIREN,
  SIRET,
  VAT_NUMBER,
  APE_CODE,
  APE_LABEL,
  RNE_REG_DATE,
  RCS_CITY,
  CAPITAL_EUR,
  ADDRESS_LINE_1,
  ADDRESS_LINE_2,
  POSTAL_CODE,
  CITY,
  COUNTRY,
  REPRESENTATIVE_NAME,
  REPRESENTATIVE_TITLE,
  CONTACT_EMAIL,
  SITE_URL,
  HOST_NAME,
  HOST_ADDRESS,
  HOST_PHONE,
  LAST_UPDATED,
} from "@/lib/legal-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — Asthia",
  description: "Informations légales de l'éditeur, de l'hébergeur et droits applicables au site Asthia.",
};

/**
 * Mentions légales obligatoires (LCEN art. 6 III).
 *
 * Sections requises par la loi :
 *   1. Identification de l'éditeur (raison sociale, SIREN, capital, RCS, siège)
 *   2. Directeur de publication (représentant légal)
 *   3. Hébergeur (nom, adresse, téléphone)
 *   4. Propriété intellectuelle
 *   5. Conditions d'utilisation succinctes (renvoi vers CGU complètes)
 *   6. Droit applicable + juridiction compétente
 */
export default function MentionsLegales() {
  return (
    <article className="prose-legal">
      <h1 className="text-h1 mb-2">Mentions légales</h1>
      <p className="text-small text-ink-500 mb-8">
        Dernière mise à jour : {LAST_UPDATED}
      </p>

      <Section title="1. Éditeur du site">
        <p>
          Le site <strong>{SITE_URL}</strong> (ci-après &laquo;&nbsp;{TRADE_NAME}&nbsp;&raquo;)
          est édité par&nbsp;:
        </p>
        <ul>
          <li><strong>Nom de l&apos;exploitant</strong> : {LEGAL_NAME}</li>
          <li><strong>Nom commercial</strong> : {TRADE_NAME}</li>
          <li><strong>Forme juridique</strong> : {LEGAL_FORM}</li>
          <li><strong>SIREN</strong> : {SIREN}</li>
          <li><strong>SIRET (siège)</strong> : {SIRET}</li>
          <li><strong>N° de TVA intracommunautaire</strong> : {VAT_NUMBER}</li>
          <li>
            <strong>Code APE / NAF</strong> : {APE_CODE} — {APE_LABEL}
          </li>
          <li>
            <strong>Inscription au Registre National des Entreprises (RNE)</strong>
            {" "}: le {RNE_REG_DATE}
          </li>
          {RCS_CITY ? <li><strong>RCS</strong> : {RCS_CITY}</li> : null}
          {CAPITAL_EUR ? <li><strong>Capital social</strong> : {CAPITAL_EUR}</li> : null}
          <li>
            <strong>Siège social</strong> : {ADDRESS_LINE_1}
            {ADDRESS_LINE_2 ? `, ${ADDRESS_LINE_2}` : ""}, {POSTAL_CODE} {CITY}, {COUNTRY}
          </li>
          <li><strong>Email de contact</strong> : <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
        </ul>
      </Section>

      <Section title="2. Directeur de la publication">
        <p>
          Le directeur de la publication est <strong>{REPRESENTATIVE_NAME}</strong>,
          {" "}{REPRESENTATIVE_TITLE} de {LEGAL_NAME}.
        </p>
      </Section>

      <Section title="3. Hébergeur">
        <p>Le site est hébergé par&nbsp;:</p>
        <ul>
          <li><strong>{HOST_NAME}</strong></li>
          <li>{HOST_ADDRESS}</li>
          <li>Téléphone : {HOST_PHONE}</li>
        </ul>
      </Section>

      <Section title="4. Propriété intellectuelle">
        <p>
          L&apos;ensemble des éléments accessibles sur le site (textes,
          graphismes, logos, icônes, photographies, sons, vidéos, logiciels,
          bases de données, etc.) est protégé par le droit de la propriété
          intellectuelle et reste la propriété exclusive de {LEGAL_NAME} ou de
          ses partenaires.
        </p>
        <p>
          Toute reproduction, représentation, modification ou diffusion,
          intégrale ou partielle, du contenu du site sur quelque support et par
          quelque procédé que ce soit, sans autorisation écrite préalable, est
          strictement interdite et constituerait un délit de contrefaçon
          (art. L.335-2 et suivants du Code de la propriété intellectuelle).
        </p>
      </Section>

      <Section title="5. Données personnelles">
        <p>
          Les modalités de collecte et de traitement des données personnelles
          des utilisateurs sont décrites dans la{" "}
          <a href="/legal/confidentialite" className="text-brand-600 underline">
            Politique de confidentialité
          </a>{" "}
          du site.
        </p>
      </Section>

      <Section title="6. Conditions d'utilisation">
        <p>
          L&apos;utilisation du service Asthia est régie par les{" "}
          <a href="/legal/cgu" className="text-brand-600 underline">
            Conditions Générales d&apos;Utilisation
          </a>
          , que tout utilisateur est réputé accepter sans réserve dès lors
          qu&apos;il crée un compte.
        </p>
      </Section>

      <Section title="7. Droit applicable et juridiction">
        <p>
          Les présentes mentions légales sont soumises au droit français. En
          cas de litige, et après recherche d&apos;une solution amiable, les
          tribunaux français seront seuls compétents.
        </p>
      </Section>

      <Section title="8. Crédits">
        <p>
          Asthia s&apos;appuie sur des composants open source dont la liste est
          disponible sur demande auprès du contact ci-dessus.
        </p>
      </Section>
    </article>
  );
}

/**
 * Section avec ancre cliquable. Le `id` est dérivé du titre pour permettre
 * de partager un lien direct vers une section précise.
 */
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
      <div className="space-y-3 text-body text-ink-700 leading-relaxed">{children}</div>
    </section>
  );
}
