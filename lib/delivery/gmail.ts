import { sendGmail } from "@/lib/gmail";
import type { DeliveryAdapter, DeliveryInput, DeliveryResult } from "./types";

/**
 * Adaptateur Gmail — envoie la facture par email depuis la boîte de
 * l'émetteur (refresh token OAuth stocké dans profiles).
 *
 * Canal par défaut pour :
 *  - Les factures B2C (particuliers)
 *  - Les factures B2B tant que la PDP n'est pas configurée
 *  - Les factures à l'international (en attendant l'intégration e-reporting)
 */
export const gmailAdapter: DeliveryAdapter = {
  channel: "gmail",

  canDeliver(input: DeliveryInput): boolean {
    // On a besoin d'un refresh token + d'une adresse expéditrice.
    return Boolean(
      input.sender.gmailRefreshToken && input.sender.gmailConnectedEmail
    );
  },

  async deliver(input: DeliveryInput): Promise<DeliveryResult> {
    if (!input.email) {
      throw new Error("Gmail: payload email manquant (subject/text/html)");
    }
    if (!input.sender.gmailRefreshToken || !input.sender.gmailConnectedEmail) {
      throw new Error(
        "Gmail non connecté. Reconnecte-toi avec Google depuis la page d'accueil."
      );
    }

    await sendGmail({
      refreshToken: input.sender.gmailRefreshToken,
      fromEmail: input.sender.gmailConnectedEmail,
      fromName: input.sender.displayName || input.sender.gmailConnectedEmail,
      to: input.recipient.email,
      subject: input.email.subject,
      text: input.email.text,
      html: input.email.html,
      bccSelf: input.email.bccSelf ?? true,
      attachment: {
        filename: input.pdf.filename,
        contentType: "application/pdf",
        content: input.pdf.bytes,
      },
    });

    return {
      channel: "gmail",
      // Gmail API renvoie un messageId, mais sendGmail ne le propage pas
      // pour l'instant. On laisse null — à brancher plus tard si besoin.
      reference: null,
      status: "sent",
      deliveredAtIso: new Date().toISOString(),
    };
  },
};
