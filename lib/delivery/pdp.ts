import type { DeliveryAdapter, DeliveryInput, DeliveryResult } from "./types";

/**
 * Stub PDP — placeholder qui simule l'envoi vers une Plateforme de
 * Dématérialisation Partenaire (Qonto, Pennylane, Docaposte, etc.)
 *
 * Activation : env var `PDP_PROVIDER` définie et ≠ "none".
 * Tant que la variable vaut "none" ou n'existe pas, le dispatcher
 * n'essaie jamais la PDP → tout passe via Gmail (comportement actuel).
 *
 * Pour brancher une vraie PDP en 2026 :
 *  1. Lister les providers supportés ici (ex: "qonto", "pennylane", "docaposte")
 *  2. Appeler leur API REST dans deliver() avec le PDF Factur-X BASIC
 *  3. Mapper le statut renvoyé (soumise / reçue / acceptée / rejetée)
 *
 * Pour l'instant, deliver() jette une erreur explicite si appelé —
 * ce qui ne devrait jamais arriver grâce à canDeliver().
 */

export const PDP_PROVIDERS = ["none", "qonto", "pennylane", "docaposte"] as const;
export type PdpProvider = (typeof PDP_PROVIDERS)[number];

function currentProvider(): PdpProvider {
  const raw = (process.env.PDP_PROVIDER ?? "none").toLowerCase();
  return (PDP_PROVIDERS as readonly string[]).includes(raw)
    ? (raw as PdpProvider)
    : "none";
}

function isFrenchBtoB(input: DeliveryInput): boolean {
  const countryOk = (input.recipient.countryCode || "FR").toUpperCase() === "FR";
  const sirenOk = /^\d{9}$/.test((input.recipient.siren ?? "").replace(/\s/g, ""));
  return countryOk && sirenOk;
}

export const pdpAdapter: DeliveryAdapter = {
  channel: "pdp",

  canDeliver(input: DeliveryInput): boolean {
    // Conditions cumulatives pour qu'une PDP prenne le relais :
    //  1. Un provider est configuré (≠ "none")
    //  2. Destinataire B2B français identifié par SIREN
    return currentProvider() !== "none" && isFrenchBtoB(input);
  },

  async deliver(input: DeliveryInput): Promise<DeliveryResult> {
    const provider = currentProvider();
    if (provider === "none") {
      throw new Error(
        "PDP non configurée (PDP_PROVIDER=none). Cet adaptateur ne devrait pas être appelé."
      );
    }
    // Placeholder : à remplacer par un switch sur provider avec des appels
    // API réels dès qu'une PDP sera intégrée.
    throw new Error(
      `PDP '${provider}' : adaptateur non encore implémenté. ` +
        `Intégrer l'API du provider dans lib/delivery/pdp.ts.`
    );
    // Le void ci-dessous satisfait TS (dead code) et montre la forme attendue
    // par le retour une fois l'intégration faite.
    // return {
    //   channel: "pdp",
    //   reference: "tx-uuid-returned-by-pdp",
    //   status: "submitted",
    //   deliveredAtIso: new Date().toISOString(),
    // };
  },
};
