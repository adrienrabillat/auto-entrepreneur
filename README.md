# auto-entrepreneur

Une app web minimaliste pour auto-entrepreneurs. Trois personnes (toi, ta mère, ton frère) l'utilisent depuis n'importe où. Design inspiré de Notion.

Ce qu'elle fait :

- **Login** via Google (ta propre boîte Gmail).
- **Créer une facture** en 10 secondes : description, montant, email du client.
- **Envoyer la facture** depuis *ta propre* boîte Gmail (le client reçoit un vrai mail de toi, avec le PDF en pièce jointe, et toi tu reçois une copie).
- **Suivi des paiements** : clic pour marquer une facture comme payée.
- **Déclaration URSSAF automatique** le jour du mois que tu choisis (3 par défaut). Si tu n'as rien encaissé, elle déclare 0 €. Si tu as encaissé 200 €, elle déclare 200 €.
- **Zéro saisie double** : le chiffre d'affaires se calcule tout seul à partir des factures marquées comme payées.

Stack : Next.js 14 (App Router) + Supabase (auth + Postgres + Storage) + Gmail API + Tailwind CSS.

---

## Mise en route

Trois comptes à créer. Compte ~45 minutes la première fois. Ensuite c'est déployé une bonne fois pour toutes.

### 1. Cloner le projet

```bash
cd auto-entrepreneur
cp .env.example .env.local
npm install
```

### 2. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com), clique **New Project** (gratuit).
2. Note quelque part :
   - `Project URL` → dans `.env.local` comme `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (Settings → API) → `SUPABASE_SERVICE_ROLE_KEY` — **ne partage jamais cette clé, elle bypasse la sécurité**.
3. Ouvre le SQL Editor, copie-colle le contenu de `supabase/schema.sql`, exécute.
4. Active le provider Google : Authentication → Providers → Google → *Enable*. On revient remplir le *Client ID / Secret* à l'étape 3.
5. Dans Authentication → URL Configuration, ajoute l'URL de redirection de ton app (ex : `http://localhost:3000/auth/callback` en dev, et ton URL Vercel en prod).

### 3. Créer le projet Google Cloud (pour Gmail + login)

1. Va sur [console.cloud.google.com](https://console.cloud.google.com), crée un projet (nom au pif : "auto-entrepreneur").
2. **APIs & Services → Library** → active **Gmail API**.
3. **APIs & Services → OAuth consent screen** :
   - Type : *External*.
   - App name : "auto-entrepreneur", email support : toi.
   - Scopes : ajoute `.../auth/userinfo.email`, `.../auth/userinfo.profile`, **`.../auth/gmail.send`**.
   - Test users : ajoute les 3 emails Gmail (maman, frangin, toi). Tant que l'app est en *Testing*, seuls ces comptes peuvent se connecter — parfait pour un usage familial, pas besoin de passer la vérification Google.
4. **APIs & Services → Credentials** → **Create Credentials → OAuth client ID** :
   - Type : *Web application*.
   - Authorized redirect URIs : ajoute
     - `https://<ton-projet>.supabase.co/auth/v1/callback` ← **le callback Supabase**, pas le tien
     - (facultatif pour tests directs) `http://localhost:3000/auth/callback`
   - Note le *Client ID* et *Client secret*.
5. Colle le Client ID / Secret :
   - dans `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
   - **et** dans Supabase → Authentication → Providers → Google (sinon le login échoue).

### 4. Lancer en local

```bash
npm run dev
# http://localhost:3000
```

Première connexion : Google te demandera d'autoriser l'envoi d'emails Gmail → accepte. Puis tu remplis ton profil (SIRET, adresse…) → dashboard.

### 5. Déployer sur Vercel

1. Push le repo sur GitHub.
2. [vercel.com](https://vercel.com) → *Import Project* → ton repo.
3. Dans *Environment Variables*, recopie tout ce qui est dans `.env.local` (en remplaçant `localhost:3000` par ton URL Vercel dans `NEXT_PUBLIC_APP_URL` et `GOOGLE_REDIRECT_URI`).
4. Génère un `CRON_SECRET` au hasard (ex: `openssl rand -hex 32`) et mets-le dans les env vars Vercel.
5. Déploie.
6. Reviens dans Google Cloud → OAuth client → ajoute `https://<ton-projet>.supabase.co/auth/v1/callback` si ce n'est pas déjà fait (c'est la même URL en dev et prod, car Supabase route ensuite vers ton app).
7. Vercel exécute `/api/cron/declarations` tous les jours à 8h UTC. Rien à faire.

### 6. Passer l'URSSAF en live (quand tu auras les credentials)

Quand l'URSSAF te donnera ton `client_id` / `client_secret` pour l'API tiers-déclarant :

1. Remplis `URSSAF_API_BASE_URL`, `URSSAF_CLIENT_ID`, `URSSAF_CLIENT_SECRET` dans Vercel.
2. Passe `URSSAF_LIVE=true`.
3. Implémente `submitDeclarationLive` dans `lib/urssaf.ts` (le squelette est déjà là, il ne reste qu'à faire l'appel HTTP selon leur doc).
4. Redéploie.

Rien d'autre ne change — toute la chaîne (cron, historique, UI) continue à fonctionner.

---

## Test manuel du cron

Tu peux lancer le cron à la main n'importe quand :

```bash
# Ta propre déclaration du mois précédent :
curl -X POST https://<ton-domaine>/api/declarations/run-mine \
  -H "Cookie: <ton cookie supabase>"

# Ou déclencher le cron global :
curl -X POST https://<ton-domaine>/api/cron/declarations \
  -H "Authorization: Bearer $CRON_SECRET"
```

Paramètres utiles en query string (pour `/api/cron/declarations`) :

- `?day=3` — force "on est le 3 du mois" (sinon : aujourd'hui)
- `?year=2026&month=3` — déclarer mars 2026
- `?userId=<uuid>` — ne traiter qu'un seul utilisateur

---

## Architecture en 2 lignes

- **Une facture** passe par : *draft* (créée) → *sent* (envoyée par email, date enregistrée) → *paid* (clic "marquer payée", date enregistrée).
- **La déclaration URSSAF** du mois N additionne toutes les factures dont `paid_at` est dans le mois N. Rien d'autre ne compte (pas les envoyées non payées).

Les seules infos qui ne se calculent pas toutes seules : le `paid_at` (date d'encaissement réel — tu cliques quand tu reçois le virement) et les infos de ton profil.

---

## Sécurité

- Row-Level Security Postgres : chaque utilisateur ne voit que *ses* lignes.
- Refresh token Gmail stocké côté serveur uniquement (jamais exposé au navigateur).
- Service role key utilisée uniquement par le cron et quelques routes serveur.
- Cron protégé par `CRON_SECRET` (header `Authorization: Bearer …`) ou par le header `x-vercel-cron` que seul Vercel peut injecter.

## Fichiers importants

```
app/                     Next.js App Router
  page.tsx               Landing + login
  onboarding/            1re connexion : profil
  (app)/dashboard        Stats + dernières factures
  (app)/invoices         Liste + création + détail
  (app)/declarations     Historique URSSAF
  (app)/settings         Modifier profil
  auth/callback          OAuth callback — stocke le refresh token Gmail
  api/invoices           Create / send / mark-paid / pdf
  api/cron/declarations  Cron quotidien
  api/declarations/run-mine  Déclaration à la demande
lib/
  supabase/              Clients (browser / server / admin)
  gmail.ts               Envoi de mail via Gmail API + refresh token
  pdf.ts                 Génération PDF (pdf-lib)
  urssaf.ts              Adapter URSSAF (mock + live)
  invoice-service.ts     Orchestration création/envoi facture
  declaration-service.ts Orchestration cron URSSAF
supabase/schema.sql      Tables + RLS + triggers + bucket
vercel.json              Cron daily 8:00 UTC
```
