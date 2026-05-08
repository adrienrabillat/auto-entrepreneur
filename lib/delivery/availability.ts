/**
 * Capacité d'envoi d'email — réponse à la question "peut-on envoyer
 * un email à un client en ce moment ?".
 *
 * Depuis la décommission Gmail (mai 2026), tout l'envoi passe par Resend
 * sous l'identité Asthia (`factures@asthia.fr`). Le seul prérequis est
 * d'avoir `RESEND_API_KEY` en env. Google reste actif comme provider
 * d'authentification (login OAuth) mais on ne demande plus le scope
 * `gmail.send`, donc on n'a plus de refresh token Gmail à utiliser.
 */
export function canSendEmail(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
