# Asthia

Invoicing and automated tax declarations for French freelancers.

**Live app:** https://asthia.fr

Asthia is a web application that lets a self-employed worker in France issue an invoice, send it by email, track whether it has been paid, and have the corresponding revenue declared to URSSAF automatically at the end of the month. In France, freelancers registered under the *auto-entrepreneur* status must report their income to URSSAF, the national social security collection agency, on a fixed schedule. Most of them do it by hand: they reopen their invoices, add up the ones that were actually paid during the period, and retype the total into a government form. Asthia removes that step.

I designed and built the whole application myself, from the data model to the production deployment.

## Features

- **Google sign-in.** Authentication through Google OAuth, so there is no password to manage.
- **Invoice creation.** Build an invoice, save it as a draft, and send it to the client directly from the app.
- **Email delivery through Gmail.** Invoices are sent from the user's own Gmail account using the Gmail API, so the client receives the invoice from a real address rather than a no-reply relay.
- **Payment tracking.** Each invoice moves through three states: draft, sent, paid. Only the user marks an invoice as paid.
- **Automated URSSAF declarations.** A scheduled job runs at the end of each period, sums the invoices marked as paid during that calendar month, and prepares the declaration. Revenue is derived from the invoices themselves, so there is no double entry and no spreadsheet to keep in sync.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS |
| Database and auth | Supabase (PostgreSQL, Row Level Security, Google OAuth) |
| Email | Gmail API |
| Scheduled jobs | Vercel Cron |
| Hosting | Vercel |

## How it works

**Invoice lifecycle.** An invoice is created as a draft. Sending it moves it to the sent state and triggers a Gmail API call that delivers it to the client. The user marks it as paid when the money arrives. Only paid invoices count toward a declaration, which matches how URSSAF works: what is declared is cash actually received during the period, not what was invoiced.

**Declarations.** A cron job runs on a schedule and, for each user, sums the invoices marked as paid within the calendar month and produces the declaration for that period. Because the amount is computed from invoice records rather than entered by hand, the declared revenue and the invoice history can never drift apart.

**Data isolation.** Every table is protected by PostgreSQL Row Level Security policies in Supabase. A user's queries can only ever return that user's own rows, which is enforced by the database rather than by the application code.

**Secrets.** Gmail refresh tokens are stored and used server side only and are never exposed to the browser. The cron endpoint is not public: it rejects any request that does not carry either the shared `CRON_SECRET` or the header Vercel attaches to its own scheduled invocations.

## Running it locally

You need Node.js, a Supabase project, and a Google Cloud project.

**1. Clone and install**

```bash
git clone https://github.com/adrienrabillat/asthia.git
cd asthia
npm install
```

**2. Set up Supabase**

Create a new Supabase project, run the SQL schema from the `supabase` folder against it, and enable Google as an authentication provider.

**3. Set up Google Cloud**

Create a project in the Google Cloud console, enable the Gmail API, and create OAuth credentials with the scopes needed to send mail on the user's behalf. Add your local and production callback URLs to the authorised redirect URIs.

**4. Configure the environment**

Copy `.env.example` to `.env.local` and fill in the values from the two consoles above.

```bash
cp .env.example .env.local
```

**5. Run**

```bash
npm run dev
```

The app is served at http://localhost:3000.

**6. Deploy**

The project is built for Vercel. Import the repository, add the same environment variables to the project settings, and deploy. The cron schedule is declared in `vercel.json` and starts running once the project is live.

## Project structure

```
app/         Next.js App Router routes, pages and API handlers
components/  React components
lib/         Supabase client, Gmail integration, business logic
supabase/    Database schema and policies
types/       Shared TypeScript types
docs/        Setup and operating notes
middleware.ts  Route protection
vercel.json    Cron schedule
```

## Status

Asthia is running in production and in real use. It is a personal project, built and maintained by one person, and it is not affiliated with URSSAF or with any French public administration.

## Author

Adrien Rabillat, engineering student at ESILV, Paris.
GitHub: https://github.com/adrienrabillat
