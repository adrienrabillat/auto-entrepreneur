import {
  LEGAL_NAME,
  ADDRESS_LINE_1,
  POSTAL_CODE,
  CITY,
  COUNTRY,
  PRIVACY_EMAIL,
  CONTACT_EMAIL,
  DB_PROVIDER_NAME,
  DB_PROVIDER_URL,
  OAUTH_PROVIDER_NAME,
  OAUTH_PROVIDER_URL,
  HOST_NAME,
  LAST_UPDATED,
} from "@/lib/legal-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Asthia",
  description: "Comment Asthia collecte, traite et protège vos données personnelles, conformément au RGPD.",
};

/**
 * Politique de confidentialité — RGPD compliant.
 *
 * Doit couvrir :
 *  - Identité du responsable de traitement
 *  - Données collectées (compte, factures, clients, OAuth Gmail)
 *  - Finalités précises et bases légales
 *  - Durée de conservation
 *  - Sous-traitants (Supabase, Google, Vercel)
 *  - Droits des utilisateurs (accès, rectification, suppression, portabilité)
 *  - Procédure pour exercer ses droits
 *  - Sécurité des données
 *  - Cookies (minimal — pas de tracking publicitaire)
 *  - Contact DPO
 */
export default function Confidentialite() {
  return (
    <article className="prose-legal">
      <h1 className="text-h1 mb-2">Politique de confidentialité</h1>
      <p className="text-small text-ink-500 mb-8">
        Dernière mise à jour : {LAST_UPDATED}
      </p>

      <Section title="1. Responsable de traitement">
        <p>
          Le responsable de traitement des données personnelles collectées sur
          Asthia est {LEGAL_NAME}, dont le siège social est situé&nbsp;:
        </p>
        <p>
          {ADDRESS_LINE_1}
          <br />
          {POSTAL_CODE} {CITY}, {COUNTRY}
        </p>
        <p>
          Pour toute question relative au traitement de vos données, vous
          pouvez nous contacter à&nbsp;:
          {" "}<a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
        </p>
      </Section>

      <Section title="2. Données collectées">
        <h3 className="text-h3 mt-4">2.1. Données de compte</h3>
        <p>
          Lorsque vous créez un compte sur Asthia via Google OAuth, nous
          collectons&nbsp;:
        </p>
        <ul>
          <li>votre nom et prénom (tels que retournés par Google) ;</li>
          <li>votre adresse email Google ;</li>
          <li>un jeton de rafraîchissement (refresh token) Google nécessaire
            pour envoyer des emails en votre nom via Gmail (scope
            <code className="px-1 py-0.5 rounded bg-surface-2 text-xs">gmail.send</code>).
            Ce jeton est chiffré au repos par notre prestataire Supabase et
            n&apos;est jamais envoyé à votre navigateur.</li>
        </ul>

        <h3 className="text-h3 mt-4">2.2. Données professionnelles d&apos;auto-entrepreneur</h3>
        <p>
          Pour générer des factures conformes à la réglementation française,
          nous collectons les informations que vous saisissez dans votre
          profil&nbsp;:
        </p>
        <ul>
          <li>nom commercial, métier, SIREN/SIRET, code APE/NAF ;</li>
          <li>adresse postale du siège ;</li>
          <li>téléphone, site web ;</li>
          <li>RIB (IBAN, BIC) — utilisé uniquement pour l&apos;affichage sur
            les factures, jamais pour des prélèvements ;</li>
          <li>numéros RCS / Répertoire des Métiers le cas échéant ;</li>
          <li>nom de votre assureur responsabilité civile professionnelle ;</li>
          <li>nom et URL de votre médiateur de la consommation (BtoC).</li>
        </ul>

        <h3 className="text-h3 mt-4">2.3. Données métier</h3>
        <p>
          Vous saisissez et stockez via Asthia&nbsp;:
        </p>
        <ul>
          <li>vos clients (nom, email, SIREN, adresse) ;</li>
          <li>vos factures et avoirs (numéro, montant, description, statut) ;</li>
          <li>vos devis ;</li>
          <li>l&apos;historique de vos déclarations URSSAF ;</li>
          <li>les données importées depuis un autre logiciel (factures
            historiques, CA déjà encaissé).</li>
        </ul>
      </Section>

      <Section title="3. Finalités et bases légales">
        <p>
          Les données sont traitées exclusivement pour les finalités
          suivantes&nbsp;:
        </p>
        <ul>
          <li>
            <strong>Fourniture du service</strong> — création de factures,
            envoi de mails au nom de l&apos;utilisateur, génération de PDF
            Factur-X. Base légale : exécution du contrat (art. 6.1.b RGPD).
          </li>
          <li>
            <strong>Pré-saisie et automatisation des déclarations URSSAF</strong>
            {" "}— calcul mensuel/trimestriel du CA encaissé, soumission
            automatisée à l&apos;API URSSAF auto-entrepreneur. Base légale :
            exécution du contrat.
          </li>
          <li>
            <strong>Sécurité et lutte contre la fraude</strong> — journalisation
            des connexions, détection d&apos;anomalies. Base légale : intérêt
            légitime (art. 6.1.f RGPD).
          </li>
          <li>
            <strong>Communication avec l&apos;utilisateur</strong> — emails de
            service (réinitialisation, notifications de déclaration). Base
            légale : exécution du contrat.
          </li>
        </ul>
        <p>
          <strong>
            Aucune donnée n&apos;est utilisée à des fins publicitaires ni
            revendue à des tiers.
          </strong>
        </p>
      </Section>

      <Section title="4. Durée de conservation">
        <p>
          Les données sont conservées pendant la durée nécessaire aux finalités
          ci-dessus, dans les limites suivantes&nbsp;:
        </p>
        <ul>
          <li>
            <strong>Pièces comptables (factures, avoirs)</strong> : 10 ans à
            compter de leur émission (art. L.123-22 du Code de commerce). Cette
            durée s&apos;impose même après suppression du compte.
          </li>
          <li>
            <strong>Données de compte et profil</strong> : pendant toute la
            durée de l&apos;utilisation du Service, et jusqu&apos;à 1 an après
            la dernière connexion.
          </li>
          <li>
            <strong>Refresh token Gmail</strong> : tant que la connexion Google
            n&apos;est pas révoquée par l&apos;utilisateur. Vous pouvez révoquer
            l&apos;accès à tout moment depuis votre compte Google.
          </li>
          <li>
            <strong>Logs techniques</strong> : 12 mois maximum.
          </li>
        </ul>
      </Section>

      <Section title="5. Sous-traitants">
        <p>
          Pour fournir le Service, nous nous appuyons sur les sous-traitants
          suivants, qui agissent uniquement sur instruction de {LEGAL_NAME}&nbsp;:
        </p>
        <ul>
          <li>
            <strong>{DB_PROVIDER_NAME}</strong> ({DB_PROVIDER_URL}) — base de
            données PostgreSQL, authentification, stockage des PDF de factures.
            Données hébergées dans l&apos;Union Européenne.
          </li>
          <li>
            <strong>{OAUTH_PROVIDER_NAME}</strong> — authentification OAuth et
            envoi d&apos;emails via Gmail au nom de l&apos;utilisateur. Voir la{" "}
            <a href={OAUTH_PROVIDER_URL} target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
              politique de confidentialité Google
            </a>.
          </li>
          <li>
            <strong>{HOST_NAME}</strong> — hébergement de l&apos;application
            web (frontend Next.js). Voir leurs politiques RGPD pour plus de détails.
          </li>
        </ul>
        <p>
          {LEGAL_NAME} a signé avec ses sous-traitants des accords conformes à
          l&apos;article 28 RGPD. Les transferts de données hors UE
          éventuels sont encadrés par les Clauses Contractuelles Types
          approuvées par la Commission européenne.
        </p>
      </Section>

      <Section title="6. Vos droits">
        <p>Conformément au RGPD, vous disposez des droits suivants&nbsp;:</p>
        <ul>
          <li>
            <strong>Droit d&apos;accès</strong> : obtenir une copie des données
            que nous détenons à votre sujet.
          </li>
          <li>
            <strong>Droit de rectification</strong> : corriger les données
            inexactes ou incomplètes.
          </li>
          <li>
            <strong>Droit à l&apos;effacement</strong> (&laquo; droit à
            l&apos;oubli &raquo;) : sous réserve des obligations légales de
            conservation des pièces comptables (10 ans).
          </li>
          <li>
            <strong>Droit à la portabilité</strong> : récupérer vos données dans
            un format structuré et lisible. Vous pouvez utiliser la fonction
            d&apos;export Excel directement dans l&apos;application.
          </li>
          <li>
            <strong>Droit d&apos;opposition</strong> à un traitement reposant
            sur l&apos;intérêt légitime.
          </li>
          <li>
            <strong>Droit de limitation</strong> du traitement.
          </li>
          <li>
            <strong>Droit de définir des directives post mortem</strong>
            relatives à vos données.
          </li>
        </ul>
        <p>
          Pour exercer ces droits, écrivez à{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> en précisant
          votre demande. Nous vous répondrons dans un délai d&apos;un mois.
        </p>
        <p>
          Vous avez également le droit d&apos;introduire une réclamation
          auprès de la CNIL (
          <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline">
            www.cnil.fr
          </a>
          ).
        </p>
      </Section>

      <Section title="7. Sécurité">
        <p>
          {LEGAL_NAME} met en œuvre des mesures techniques et organisationnelles
          appropriées pour protéger vos données contre l&apos;accès non
          autorisé, la perte, l&apos;altération ou la divulgation&nbsp;:
        </p>
        <ul>
          <li>chiffrement des données en transit (TLS 1.2+) ;</li>
          <li>chiffrement au repos par {DB_PROVIDER_NAME} ;</li>
          <li>cloisonnement des données par utilisateur via des politiques
            de sécurité au niveau ligne (Row Level Security) PostgreSQL ;</li>
          <li>authentification par Google OAuth ou par code à usage unique
            envoyé par email — aucun mot de passe n&apos;est stocké côté
            Asthia ;</li>
          <li>audits réguliers du code source.</li>
        </ul>
      </Section>

      <Section title="8. Cookies">
        <p>
          Asthia utilise uniquement les cookies strictement nécessaires au
          fonctionnement du Service&nbsp;:
        </p>
        <ul>
          <li>
            <strong>Cookies de session</strong> (Supabase Auth) — pour vous
            maintenir connecté ;
          </li>
          <li>
            <strong>Préférences locales</strong> (localStorage) — thème
            clair/sombre, accent de couleur. Ces données restent sur votre
            navigateur et ne sont pas envoyées au serveur.
          </li>
        </ul>
        <p>
          <strong>
            Asthia n&apos;utilise aucun cookie publicitaire ni de mesure
            d&apos;audience tiers (pas de Google Analytics, pas de Meta Pixel,
            etc.).
          </strong>
        </p>
      </Section>

      <Section title="9. Modifications de la présente politique">
        <p>
          La présente politique peut être mise à jour pour refléter
          l&apos;évolution du Service ou des obligations légales. Les
          utilisateurs seront notifiés par email en cas de modification
          substantielle. La date de dernière mise à jour figure en haut de
          cette page.
        </p>
      </Section>

      <Section title="10. Contact">
        <p>
          Pour toute question relative à vos données personnelles ou à la
          présente politique, contactez-nous à{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a> ou
          {" "}<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
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
