/**
 * Helpers pour la signature des mails Asthia.
 *
 * Style "signature mail pro" : ligne fine de séparation, logo (si défini),
 * nom (raison sociale OU prénom nom), métier en gris.
 *
 * Utilisé par :
 *  - lib/invoice-service.ts (envoi facture)
 *  - lib/quote-service.ts   (envoi devis)
 *  - app/api/messages/new/route.ts          (nouveau message)
 *  - app/api/messages/[id]/reply/route.ts   (réponse dans un thread)
 *
 * Le logo est embedded en inline via `cid:logo` (pièce jointe content-id).
 * Le HTML s'attend à ce que l'envoyeur ajoute l'image inline avec
 * `contentId: "logo"`, sinon le `<img>` ne s'affiche pas (et c'est OK,
 * il a un alt text).
 */

export type SignatureProfile = {
  display_name: string | null;
  business_name?: string | null;
  metier?: string | null;
};

export type SignatureLogo =
  | {
      bytes: Uint8Array;
      mimeType: string;
    }
  | null
  | undefined;

/**
 * Choisit le nom à afficher comme expéditeur dans la signature :
 *  - `business_name` en priorité (raison sociale = identité commerciale)
 *  - sinon `display_name` (Prénom Nom)
 *  - sinon "Asthia" en filet (ne devrait jamais arriver)
 */
export function signatureName(profile: SignatureProfile): string {
  return (
    profile.business_name?.trim() ||
    profile.display_name?.trim() ||
    "Asthia"
  );
}

/**
 * Bloc HTML de signature placé en bas du mail (après le corps et avant
 * les pièces jointes côté visuel client mail). Inclut le logo si présent.
 *
 * Pourquoi un bloc séparé visuellement ? Un trait fin + le logo dimensionné
 * petit (40px) imite le style "signature professionnelle" qu'on retrouve
 * dans Gmail / Outlook, plutôt que le grand bandeau en haut qui fait
 * "newsletter" et masque le vrai contenu du mail.
 */
export function buildSignatureHtml(
  profile: SignatureProfile,
  logo: SignatureLogo,
): string {
  const name = escapeHtml(signatureName(profile));
  const metier = profile.metier?.trim() ? escapeHtml(profile.metier.trim()) : "";

  // Logo : inline cid:logo. Hauteur volontairement modeste (40px) pour ne
  // pas dominer la signature — c'est un bloc identité, pas un header.
  const logoHtml = logo
    ? `<img src="cid:logo" alt="${name}" style="max-height:40px;max-width:200px;display:block;margin-bottom:10px;" />`
    : "";

  const metierHtml = metier
    ? `<div style="color:#6B6B68;font-size:13px;">${metier}</div>`
    : "";

  return `<div style="margin-top:32px;padding-top:18px;border-top:1px solid #E2E8F0;font-family:Inter,Helvetica,Arial,sans-serif;">
    ${logoHtml}
    <div style="font-weight:600;color:#37352F;font-size:14px;">${name}</div>
    ${metierHtml}
  </div>`;
}

/**
 * Version texte (plain) de la signature, séparée du corps par "--" comme
 * les conventions email standards (RFC 3676 §4.3 — sig delimiter).
 * Pas de logo en texte évidemment.
 */
export function buildSignatureText(profile: SignatureProfile): string {
  const name = signatureName(profile);
  const metier = profile.metier?.trim();
  return metier ? `\n\n--\n${name}\n${metier}` : `\n\n--\n${name}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
