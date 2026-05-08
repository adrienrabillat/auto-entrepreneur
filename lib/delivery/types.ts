/**
 * Abstraction du canal de livraison de facture.
 *
 * Pourquoi ? À partir de septembre 2026/2027, les factures B2B françaises
 * devront transiter par une PDP (Plateforme de Dématérialisation Partenaire)
 * au lieu d'un simple email. Au lieu de mélanger la logique d'envoi email
 * et la future logique PDP dans invoice-service, on isole chaque canal
 * derrière une interface commune `DeliveryAdapter`. Le dispatcher choisit
 * le bon adaptateur selon le type de destinataire et la configuration.
 *
 * Contrat : chaque adaptateur reçoit la facture sérialisée + le PDF Factur-X
 * et retourne un résultat uniforme (id externe, statut, timestamp).
 *
 * Historique : le canal Gmail a été décommissionné en mai 2026. Tout
 * l'envoi email passe désormais par Resend sous l'identité unifiée Asthia
 * (`factures@asthia.fr`). Google reste utilisé comme provider de login,
 * mais sans le scope `gmail.send`, donc plus de refresh token Gmail
 * persisté pour l'envoi.
 */

export type DeliveryChannel = "pdp" | "resend";

/**
 * Contexte destinataire — utilisé par le dispatcher pour choisir le canal.
 */
export type RecipientKind = {
  /** SIREN 9 chiffres si client B2B identifié, sinon null. */
  siren: string | null;
  /** Code pays ISO-2. Par défaut "FR". */
  countryCode: string;
  /** Email du destinataire. */
  email: string;
  /** Nom affiché (RS pro ou nom particulier). */
  name: string | null;
};

/**
 * Payload commun à tous les adaptateurs.
 */
export type DeliveryInput = {
  recipient: RecipientKind;
  invoice: {
    id: string;
    number: string;
    description: string;
    amount_cents: number;
    prepaid: boolean; // facture acquittée
  };
  pdf: {
    bytes: Uint8Array;
    filename: string;
  };
  /** Champs pré-construits utilisés par l'adaptateur Resend. */
  email?: {
    subject: string;
    text: string;
    html: string;
    bccSelf?: boolean;
    /** Pièces jointes inline référencées dans le HTML via `cid:<id>`.
     *  Utilisé pour embed le logo de l'AE en bannière haut-de-mail
     *  sans dépendre d'un hébergement externe (les clients mail
     *  préfèrent les inline pour des raisons de privacy). Les bytes
     *  sont passés en clair, l'adaptateur encode en base64. */
    inlineAttachments?: Array<{
      contentId: string;
      filename: string;
      contentType: string;
      bytes: Uint8Array;
    }>;
  };
  /** Infos profil émetteur nécessaires à l'envoi. */
  sender: {
    displayName: string;
    /** Email perso/pro de l'AE — utilisé en `Reply-To` pour que les
     *  réponses des clients arrivent vers l'AE même si la messagerie
     *  in-app est down. Pour les comptes avec alias Asthia, on utilise
     *  plutôt l'alias en Reply-To pour que les réponses passent par
     *  notre webhook (cf. asthiaAddress). */
    email: string;
    /** Adresse Asthia personnelle de l'AE (`<alias>@asthia.fr`). C'est
     *  l'adresse utilisée comme `from` pour l'envoi sortant et comme
     *  `Reply-To` pour que les réponses reviennent dans notre webhook
     *  inbound (puis dans la messagerie in-app + forward Gmail). */
    asthiaAddress: string;
  };
};

/**
 * Résultat d'un envoi — uniforme quel que soit le canal.
 */
export type DeliveryResult = {
  channel: DeliveryChannel;
  /** Référence renvoyée par le backend : id Resend, UUID PDP, etc. */
  reference: string | null;
  /** Statut à la livraison. Pour Resend c'est toujours "sent" à l'envoi
   *  (la confirmation de delivery arrive via webhook séparé).
   *  Pour PDP ça peut être "submitted", "received", "accepted"… */
  status: "sent" | "submitted" | "received" | "accepted" | "rejected";
  /** Timestamp ISO UTC de la livraison. */
  deliveredAtIso: string;
};

/**
 * Interface qu'un adaptateur doit implémenter.
 */
export interface DeliveryAdapter {
  readonly channel: DeliveryChannel;
  /** Retourne `true` si l'adaptateur peut prendre en charge ce destinataire
   *  dans la configuration actuelle (env, credentials, compat pays). */
  canDeliver(input: DeliveryInput): boolean;
  deliver(input: DeliveryInput): Promise<DeliveryResult>;
}
