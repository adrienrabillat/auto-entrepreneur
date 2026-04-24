import { gmailAdapter } from "./gmail";
import { pdpAdapter } from "./pdp";
import type { DeliveryAdapter, DeliveryInput, DeliveryResult } from "./types";

export type { DeliveryAdapter, DeliveryInput, DeliveryResult, DeliveryChannel } from "./types";

/**
 * Dispatcher — choisit le bon adaptateur pour livrer la facture.
 *
 * Priorité :
 *  1. PDP (si configurée ET destinataire B2B français avec SIREN)
 *     → conforme obligation e-invoicing 2026/2027
 *  2. Gmail (fallback et canal par défaut)
 *     → B2C, international, ou B2B tant que la PDP n'est pas configurée
 *
 * L'ordre est important : la PDP gagne toujours si elle peut, parce
 * qu'envoyer par email une facture B2B après septembre 2027 ne sera
 * plus légal. Tant qu'on est en 2025, canDeliver() renverra false
 * (PDP_PROVIDER=none) et on tombe naturellement sur Gmail.
 *
 * Pour forcer un canal spécifique (debug, dry-run), passer `forceChannel`.
 */
const ADAPTERS: DeliveryAdapter[] = [pdpAdapter, gmailAdapter];

export async function deliverInvoice(
  input: DeliveryInput,
  opts?: { forceChannel?: "gmail" | "pdp" }
): Promise<DeliveryResult> {
  if (opts?.forceChannel) {
    const forced = ADAPTERS.find((a) => a.channel === opts.forceChannel);
    if (!forced) throw new Error(`Canal ${opts.forceChannel} inconnu`);
    return forced.deliver(input);
  }

  const candidate = ADAPTERS.find((a) => a.canDeliver(input));
  if (!candidate) {
    throw new Error(
      "Aucun canal de livraison disponible. Vérifie la connexion Gmail ou la configuration PDP."
    );
  }
  return candidate.deliver(input);
}
