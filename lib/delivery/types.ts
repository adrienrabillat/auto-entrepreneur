/**
 * Abstraction du canal de livraison de facture.
 *
 * Pourquoi ? À partir de septembre 2026/2027, les factures B2B françaises
 * devront transiter par une PDP (Plateforme de Dématérialisation Partenaire)
 * au lieu d'un simple email. Au lieu de mélanger la logique Gmail et la
 * future logique PDP dans invoice-service, on isole chaque canal derrière
 * une interface commune `DeliveryAdapter`. Le dispatcher choisit le bon
 * adaptateur selon le type de destinataire et la configuration.
 *
 * Contrat : chaque adaptateur reçoit la facture sérialisée + le PDF Factur-X
 * et retourne un résultat uniforme (id externe, statut, timestamp).
 */

export type DeliveryChannel = "gmail" | "pdp" | "resend";

/**
 * Contexte destinataire — utilisé par le dispatcher pour choisir le canal.
 */
export type RecipientKind = {
  /** SIREN 9 chiffres si client B2B identifié, sinon null. */
  siren: string | null;
  /** Code pays ISO-2. Par défaut "FR". */
  countryCode: string;
  /** Email du destinataire (pour Gmail et notifications PDP). */
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
  /** Champs pré-construits utilisés uniquement par l'adaptateur Gmail. */
  email?: {
    subject: string;
    text: string;
    html: string;
    bccSelf?: boolean;
  };
  /** Infos profil émetteur nécessaires à l'envoi (refresh token Gmail, etc.). */
  sender: {
    displayName: string;
    email: string;
    gmailRefreshToken: string | null;
    gmailConnectedEmail: string | null;
  };
};

/**
 * Résultat d'un envoi — uniforme quel que soit le canal.
 */
export type DeliveryResult = {
  channel: DeliveryChannel;
  /** Référence renvoyée par le backend : messageId Gmail, UUID PDP, etc. */
  reference: string | null;
  /** Statut à la livraison. Pour Gmail c'est toujours "sent".
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
