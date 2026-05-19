/**
 * @deprecated Remplacé par {@link ./email-otp-form.tsx EmailOtpForm}.
 *
 * Ce fichier ne sera plus utilisé : le flow email/password a été remplacé
 * par un flow OTP code par email (mai 2026). Il est conservé temporairement
 * en réexport pour ne pas casser un éventuel import oublié, mais peut être
 * supprimé en toute sécurité à la prochaine itération.
 *
 *   $ git rm app/email-login-form.tsx
 */
export { EmailOtpForm as EmailLoginForm } from "./email-otp-form";
