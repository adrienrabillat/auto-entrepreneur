/**
 * Capacité d'envoi d'email — réponse à la question "peut-on envoyer
 * un email à un client en ce moment ?".
 *
 * Pourquoi ce helper plutôt que `Boolean(profile.gmail_refresh_token)` ?
 *  Avant l'intégration Resend, Gmail était le seul canal. Aujourd'hui :
 *   - Les utilisateurs Google → Gmail (canal historique).
 *   - Les utilisateurs email/mot de passe → Resend (identité Asthia).
 *  Gater l'UI sur `gmail_refresh_token` rendait le bouton "Envoyer"
 *  inactif pour les comptes email/mdp, alors que Resend peut prendre
 *  le relais.
 *
 *  Source de vérité côté serveur : on regarde si l'un des canaux email
 *  est dispo (Gmail connecté OU clé Resend en env). PDP n'est pas comptée
 *  ici car son éligibilité dépend du destinataire (B2B FR + SIREN), pas
 *  du compte émetteur — la décision PDP se fait côté dispatcher au moment
 *  de l'envoi.
 */
export function canSendEmail({
  gmailRefreshToken,
}: {
  gmailRefreshToken: string | null | undefined;
}): boolean {
  if (gmailRefreshToken) return true;
  if (process.env.RESEND_API_KEY) return true;
  return false;
}
