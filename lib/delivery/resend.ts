import type { DeliveryAdapter, DeliveryInput, DeliveryResult } from "./types";

/**
 * Adaptateur Resend — envoie la facture par email depuis l'identité
 * Asthia (`factures@asthia.fr`) au lieu de la boîte Gmail personnelle
 * de l'AE.
 *
 * Pourquoi ce canal en plus de Gmail ?
 *  - **Identité unifiée** : tous les utilisateurs envoient depuis
 *    `asthia.fr` → image plus pro qu'un envoi depuis `prenom.nom@gmail.com`.
 *  - **Indépendance** : plus besoin que l'AE ait un compte Google ni
 *    qu'il ait connecté Gmail. Étape obligatoire pour les inscriptions
 *    par email/mot de passe (cas de l'instructrice URSSAF, par exemple).
 *  - **Deliverability** : SPF/DKIM/DMARC configurés sur `asthia.fr`,
 *    mails signés correctement, suivi des bounces côté Resend.
 *  - **Coût maîtrisé** : free tier Resend = 3 000 mails/mois, ensuite
 *    ~0,001 €/mail. Largement plus viable que des boîtes OVH par AE.
 *
 * Stratégie d'identité :
 *  - `From` : "Adrien Rabillat <factures@asthia.fr>" → le nom de l'AE
 *    s'affiche comme expéditeur, mais l'adresse technique est asthia.fr.
 *  - `Reply-To` : email perso/pro de l'AE → quand le client clique
 *    "Répondre", le mail part directement à l'AE, pas à Asthia.
 *
 * Pré-requis env :
 *  - `RESEND_API_KEY` : clé API Resend (commence par "re_")
 *  - `RESEND_FROM_EMAIL` (optionnel, défaut "factures@asthia.fr")
 */
export const resendAdapter: DeliveryAdapter = {
  channel: "resend",

  canDeliver(_input: DeliveryInput): boolean {
    // Resend est dispo dès qu'on a la clé API + un email destinataire.
    // Pas besoin de Gmail connecté côté AE.
    return Boolean(process.env.RESEND_API_KEY);
  },

  async deliver(input: DeliveryInput): Promise<DeliveryResult> {
    if (!input.email) {
      throw new Error("Resend: payload email manquant (subject/text/html)");
    }
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY manquante. Définis-la dans Vercel → Project Settings → Environment Variables.",
      );
    }

    // From utilise l'alias Asthia personnel de l'AE
    // (`<alias>@asthia.fr`) calculé en amont par invoice-service /
    // quote-service via `ensureAsthiaAlias`. On garde un fallback de
    // sécurité (`factures@asthia.fr`) au cas où l'alias n'aurait pas
    // pu être généré — ne devrait jamais arriver en prod.
    const fromEmail =
      input.sender.asthiaAddress ||
      process.env.RESEND_FROM_EMAIL ||
      "factures@asthia.fr";
    const fromName = input.sender.displayName?.trim() || "Asthia";
    // RFC 5322 : si le nom contient une virgule ou un caractère spécial,
    // il faut le quoter. On reste simple : on enlève les guillemets pour
    // éviter les conflits, le nom est en général "Prénom Nom".
    const safeName = fromName.replace(/"/g, "");
    const from = `${safeName} <${fromEmail}>`;

    // Reply-To = adresse Asthia personnelle de l'AE pour que les
    // réponses des clients passent par notre webhook inbound. On y
    // les stocke dans la messagerie in-app + on forward vers le Gmail
    // perso de l'AE comme filet. Si pas d'alias (cas dégradé), on
    // tombe sur l'email perso direct.
    const replyTo =
      input.sender.asthiaAddress || input.sender.email || undefined;

    // Resend exige le PDF en base64 dans le champ `content`.
    const pdfBase64 = bytesToBase64(input.pdf.bytes);

    const payload = {
      from,
      to: [input.recipient.email],
      reply_to: replyTo,
      // BCC l'AE sur ses propres factures pour qu'il garde une trace
      // dans sa boîte mail (comme avec Gmail). Sauf opt-out explicite.
      bcc:
        input.email.bccSelf !== false && input.sender.email
          ? [input.sender.email]
          : undefined,
      subject: input.email.subject,
      html: input.email.html,
      text: input.email.text,
      attachments: [
        {
          filename: input.pdf.filename,
          content: pdfBase64,
        },
      ],
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Resend a refusé l'envoi (HTTP ${res.status}) : ${text.slice(0, 300)}`,
      );
    }

    const data = (await res.json()) as { id?: string };

    return {
      channel: "resend",
      reference: data.id ?? null,
      status: "sent",
      deliveredAtIso: new Date().toISOString(),
    };
  },
};

/**
 * Encode des bytes binaires en base64 sans dépendre de Buffer (qui
 * n'est pas dispo dans tous les environnements Edge). Utilise btoa
 * via une chaîne intermédiaire — OK pour PDF jusqu'à quelques Mo.
 */
function bytesToBase64(bytes: Uint8Array): string {
  // Path optimal côté Node : Buffer disponible, on évite la conversion
  // string intermédiaire qui consomme beaucoup de mémoire pour les
  // grosses pièces jointes.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  // Fallback navigateur / Edge runtime.
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
