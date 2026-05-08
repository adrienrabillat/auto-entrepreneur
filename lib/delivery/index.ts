import { gmailAdapter } from "./gmail";
import { pdpAdapter } from "./pdp";
import { resendAdapter } from "./resend";
import type {
  DeliveryAdapter,
  DeliveryChannel,
  DeliveryInput,
  DeliveryResult,
} from "./types";

export type { DeliveryAdapter, DeliveryInput, DeliveryResult, DeliveryChannel } from "./types";

/**
 * Dispatcher — choisit le bon adaptateur pour livrer la facture.
 *
 * Priorité :
 *  1. PDP (si configurée ET destinataire B2B français avec SIREN)
 *     → conforme obligation e-invoicing 2026/2027
 *  2. Resend (si RESEND_API_KEY défini)
 *     → identité unifiée Asthia (factures@asthia.fr), pas besoin de
 *       Gmail connecté côté AE. Adapté aux comptes créés par
 *       email/mot de passe (instructeur URSSAF, AE sans Google…).
 *  3. Gmail (fallback historique)
 *     → conserve le comportement original pour les AE qui ont
 *       connecté leur Gmail à l'onboarding et n'ont pas Resend dispo.
 *
 * L'ordre est important :
 *  - PDP gagne toujours si elle peut (obligation légale B2B 2026/2027).
 *  - Resend gagne sur Gmail si la clé est configurée — pour donner aux
 *    factures une identité Asthia plutôt que perso. Si l'AE préfère
 *    Gmail, il peut forcer via `forceChannel: "gmail"`.
 *
 * Pour forcer un canal spécifique (debug, dry-run, préférence user),
 * passer `forceChannel`.
 */
const ADAPTERS: DeliveryAdapter[] = [pdpAdapter, resendAdapter, gmailAdapter];

export async function deliverInvoice(
  input: DeliveryInput,
  opts?: { forceChannel?: DeliveryChannel }
): Promise<DeliveryResult> {
  if (opts?.forceChannel) {
    const forced = ADAPTERS.find((a) => a.channel === opts.forceChannel);
    if (!forced) throw new Error(`Canal ${opts.forceChannel} inconnu`);
    return forced.deliver(input);
  }

  const candidate = ADAPTERS.find((a) => a.canDeliver(input));
  if (!candidate) {
    throw new Error(
      "Aucun canal de livraison disponible. Vérifie la connexion Gmail, la clé RESEND_API_KEY, ou la configuration PDP."
    );
  }
  return candidate.deliver(input);
}
