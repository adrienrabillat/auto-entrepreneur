# Email templates Asthia (Supabase Auth)

Ce dossier contient les templates HTML à coller dans le dashboard Supabase
pour que les emails transactionnels (confirmation d'inscription, reset
mot de passe…) soient envoyés depuis `noreply@asthia.fr` avec un design
cohérent avec le site, au lieu des templates Supabase par défaut.

## 1. Configurer le SMTP Resend dans Supabase

1. Sur Resend, va dans **API Keys** → **Create API Key** → mode "Sending access"
   uniquement → copie la clé (commence par `re_...`).
2. Dans le dashboard Supabase, va dans **Project Settings → Authentication
   → SMTP Settings**, et active "Enable Custom SMTP".
3. Renseigne :
   - **Sender email** : `noreply@asthia.fr`
   - **Sender name** : `Asthia`
   - **Host** : `smtp.resend.com`
   - **Port** : `465` (TLS) ou `587` (STARTTLS) — Resend supporte les deux,
     préfère `465` si dispo
   - **Username** : `resend` (la chaîne littérale, pas un email)
   - **Password** : la clé API Resend que tu viens de copier
4. Clique sur "Save".

> ⚠️ Une fois activé, **tous** les emails Auth de Supabase passeront par
> Resend (rate-limit Supabase qui était de 30 emails/h disparaît, tu es
> sur les quotas Resend = 3 000/mois en free tier).

## 2. Coller les templates

Dans le dashboard Supabase → **Authentication → Email Templates** :

| Template Supabase | Fichier dans ce dossier |
|---|---|
| Confirm signup | `confirm-signup.html` |
| Reset password | `reset-password.html` |
| Magic Link | `magic-link.html` (optionnel — Asthia n'utilise pas) |
| Change Email Address | `change-email.html` (optionnel) |

Pour chaque template :
1. Ouvre le template Supabase correspondant.
2. Vide le contenu HTML existant.
3. Colle le contenu du fichier `.html` correspondant.
4. **Vérifie l'URL de redirection** : Supabase remplace `{{ .ConfirmationURL }}`
   par le bon lien automatiquement, on n'a rien à toucher.
5. Mets à jour l'objet (Subject) :
   - Confirm signup : `Confirme ton compte Asthia`
   - Reset password : `Réinitialiser ton mot de passe Asthia`
6. Clique sur "Save".

## 3. Tester

1. Crée un faux compte sur `https://asthia.fr` avec une adresse email à toi.
2. Vérifie que tu reçois un mail de `noreply@asthia.fr` (vs.
   `noreply@mail.app.supabase.io` avant).
3. Le mail doit afficher le logo Asthia et le bouton de confirmation
   bleu, pas le template Supabase générique.

## 4. Variables disponibles dans les templates Supabase

Pour info — les templates utilisent la syntaxe Go templates :

- `{{ .ConfirmationURL }}` — URL à cliquer pour valider l'action
- `{{ .Email }}` — adresse email du destinataire
- `{{ .SiteURL }}` — URL du site (asthia.fr)
- `{{ .Token }}` — token (rarement utilisé directement)
- `{{ .TokenHash }}` — hash du token

Doc complète : <https://supabase.com/docs/guides/auth/auth-email-templates>
