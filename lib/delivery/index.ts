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
 *  2. Resend
 *     → identité unifiée Asthia (factures@asthia.fr). Canal d'envoi
 *       email standard depuis la décommission Gmail (mai 2026).
 *
 * Pour forcer un canal spécifique (debug, dry-run, préférence user),
 * passer `forceChannel`.
 */
const ADAPTERS: DeliveryAdapter[] = [pdpAdapter, resendAdapter];

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
      "Aucun canal de livraison disponible. Vérifie RESEND_API_KEY ou la configuration PDP.",
    );
  }
  return candidate.deliver(input);
}
