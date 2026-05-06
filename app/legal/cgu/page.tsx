import {
  LEGAL_NAME,
  SITE_URL,
  CONTACT_EMAIL,
  LAST_UPDATED,
} from "@/lib/legal-config";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — Asthia",
  description: "Conditions générales encadrant l'utilisation du service Asthia par les auto-entrepreneurs.",
};

/**
 * Conditions Générales d'Utilisation (CGU).
 *
 * Couvrent :
 *  - Objet du service
 *  - Conditions d'éligibilité (auto-entrepreneur français uniquement)
 *  - Compte utilisateur (création, sécurité, suspension)
 *  - Description du service (factures, devis, déclarations URSSAF)
 *  - Limitation de responsabilité (l'utilisateur reste responsable LÉGALEMENT
 *    de ses obligations URSSAF — Asthia est un outil, pas un mandataire)
 *  - Données utilisateur (renvoi vers RGPD)
 *  - Évolution du service (gratuit aujourd'hui, payant à terme)
 *  - Résiliation
 *  - Droit applicable
 */
export default function CGU() {
  return (
    <article className="prose-legal">
      <h1 className="text-h1 mb-2">Conditions Générales d&apos;Utilisation</h1>
      <p className="text-small text-ink-500 mb-8">
        Dernière mise à jour : {LAST_UPDATED}
      </p>

      <Section title="1. Objet">
        <p>
          Les présentes Conditions Générales d&apos;Utilisation (ci-après
          &laquo; CGU &raquo;) ont pour objet de définir les conditions
          d&apos;accès et d&apos;utilisation du service Asthia, accessible à
          l&apos;adresse {SITE_URL} (ci-après le &laquo; Service &raquo;).
        </p>
        <p>
          Le Service est édité par {LEGAL_NAME}. Il s&apos;agit d&apos;un outil
          de gestion administrative et comptable destiné aux travailleurs
          indépendants relevant du régime du micro-entrepreneur en France
          (auto-entrepreneurs).
        </p>
      </Section>

      <Section title="2. Acceptation">
        <p>
          La création d&apos;un compte sur le Service vaut acceptation pleine
          et entière des présentes CGU. L&apos;utilisateur reconnaît en avoir
          pris connaissance préalablement et les accepter sans réserve.
        </p>
        <p>
          {LEGAL_NAME} se réserve le droit de modifier les présentes CGU à
          tout moment. Les utilisateurs en seront informés par email et
          disposeront d&apos;un délai raisonnable pour résilier leur compte
          s&apos;ils n&apos;acceptent pas les nouvelles conditions.
        </p>
      </Section>

      <Section title="3. Conditions d'éligibilité">
        <p>L&apos;utilisateur déclare et garantit&nbsp;:</p>
        <ul>
          <li>être une personne physique majeure ;</li>
          <li>
            être inscrit au régime du micro-entrepreneur (anciennement
            &laquo; auto-entrepreneur &raquo;) en France et disposer d&apos;un
            numéro SIRET valide ;
          </li>
          <li>
            disposer de la capacité juridique pour conclure les présentes CGU ;
          </li>
          <li>
            fournir des informations exactes, complètes et à jour lors de
            l&apos;inscription et tout au long de l&apos;utilisation du Service.
          </li>
        </ul>
      </Section>

      <Section title="4. Compte utilisateur">
        <p>
          L&apos;utilisateur s&apos;engage à conserver la confidentialité de
          ses identifiants de connexion (notamment le compte Google associé) et
          à informer immédiatement {LEGAL_NAME} de toute utilisation non
          autorisée de son compte.
        </p>
        <p>
          {LEGAL_NAME} ne pourra être tenu responsable des conséquences
          résultant d&apos;une utilisation frauduleuse du compte par un tiers
          non autorisé.
        </p>
      </Section>

      <Section title="5. Description du service">
        <p>Le Service Asthia permet notamment&nbsp;:</p>
        <ul>
          <li>la création, l&apos;envoi et la conservation de factures conformes
            aux mentions obligatoires URSSAF ;</li>
          <li>la création et l&apos;envoi de devis ;</li>
          <li>la gestion d&apos;un carnet d&apos;adresses clients ;</li>
          <li>le calcul et la pré-saisie des déclarations mensuelles URSSAF
            sur la base du chiffre d&apos;affaires encaissé ;</li>
          <li>l&apos;import de l&apos;historique de chiffre d&apos;affaires pour
            les utilisateurs migrant depuis un autre logiciel ;</li>
          <li>l&apos;export comptable au format Excel pour transmission à un
            comptable ou à l&apos;administration fiscale ;</li>
          <li>la génération de PDF Factur-X (BASIC EN 16931) en vue de la
            facturation électronique B2B obligatoire à partir de 2026.</li>
        </ul>
      </Section>

      <Section title="6. Limites de responsabilité">
        <p>
          <strong>Asthia est un outil d&apos;assistance.</strong> En aucun cas
          {" "}{LEGAL_NAME} ne se substitue à l&apos;utilisateur dans ses
          obligations légales et fiscales. L&apos;utilisateur reste seul
          responsable&nbsp;:
        </p>
        <ul>
          <li>de la véracité et de l&apos;exactitude des informations qu&apos;il
            saisit dans le Service ;</li>
          <li>de la conformité de ses factures aux obligations légales en
            vigueur ;</li>
          <li>de la transmission effective et dans les délais de ses
            déclarations URSSAF, fiscales et sociales ;</li>
          <li>du paiement de ses cotisations et impôts ;</li>
          <li>de la conservation de ses justificatifs comptables pendant la
            durée légale (10 ans).</li>
        </ul>
        <p>
          {LEGAL_NAME} met en œuvre les meilleurs efforts pour assurer la
          disponibilité, la fiabilité et la sécurité du Service mais ne peut
          être tenu responsable&nbsp;:
        </p>
        <ul>
          <li>des interruptions dues à des opérations de maintenance ou à des
            cas de force majeure ;</li>
          <li>des erreurs dans les données saisies par l&apos;utilisateur ;</li>
          <li>des dysfonctionnements ou indisponibilités des services tiers
            utilisés (Google Gmail, API URSSAF, etc.) ;</li>
          <li>des conséquences d&apos;une déclaration URSSAF incorrecte
            résultant d&apos;une saisie erronée par l&apos;utilisateur.</li>
        </ul>
      </Section>

      <Section title="7. Tarifs et évolution">
        <p>
          Le Service est proposé <strong>gratuitement</strong> pendant la phase
          de lancement, sans engagement de durée.
        </p>
        <p>
          {LEGAL_NAME} se réserve le droit de basculer le Service vers un
          modèle payant (abonnement mensuel ou annuel) à l&apos;issue de cette
          phase. Tout passage à un modèle payant fera l&apos;objet d&apos;une
          notification préalable d&apos;au moins 30 jours par email, durant
          laquelle l&apos;utilisateur pourra résilier son compte sans frais
          ni justification s&apos;il refuse les nouvelles conditions
          tarifaires. Aucun prélèvement ne sera effectué sans accord explicite
          de l&apos;utilisateur.
        </p>
      </Section>

      <Section title="8. Données utilisateur et confidentialité">
        <p>
          Les modalités de collecte et de traitement des données personnelles
          sont décrites dans la{" "}
          <a href="/legal/confidentialite" className="text-brand-600 underline">
            Politique de confidentialité
          </a>
          , partie intégrante des présentes CGU.
        </p>
        <p>
          L&apos;utilisateur reste propriétaire de ses données et peut à tout
          moment les exporter via la fonction d&apos;export Excel ou demander
          leur suppression dans les conditions prévues par la politique de
          confidentialité.
        </p>
      </Section>

      <Section title="9. Résiliation">
        <p>
          L&apos;utilisateur peut résilier son compte à tout moment, sans
          motif, depuis l&apos;interface du Service ou en envoyant un email à
          {" "}<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
        <p>
          {LEGAL_NAME} se réserve le droit de suspendre ou résilier le compte
          d&apos;un utilisateur qui contreviendrait aux présentes CGU, après
          notification préalable sauf cas grave nécessitant une suspension
          immédiate.
        </p>
        <p>
          En cas de résiliation, l&apos;utilisateur est invité à exporter ses
          données préalablement. Les factures émises restent conservées dans
          les conditions et durées fixées par la loi française (10 ans pour
          les pièces comptables).
        </p>
      </Section>

      <Section title="10. Force majeure">
        <p>
          Aucune des parties ne pourra être tenue responsable d&apos;un
          manquement à ses obligations résultant d&apos;un cas de force
          majeure tel que défini par la jurisprudence française.
        </p>
      </Section>

      <Section title="11. Droit applicable et juridiction">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige,
          et avant toute action contentieuse, les parties s&apos;engagent à
          rechercher une solution amiable. À défaut, les tribunaux français
          seront seuls compétents.
        </p>
        <p>
          Conformément à l&apos;article L. 612-1 du Code de la consommation,
          tout consommateur a le droit de recourir gratuitement à un médiateur
          en vue de la résolution amiable du litige qui l&apos;oppose à un
          professionnel.
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
