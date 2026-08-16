# Vasantham Furniture & Home Appliances — Online Platform

A real, online, full-stack application: **Next.js (App Router) + Supabase (Postgres, Auth, Storage) + Vercel**.
No mock data, no localStorage-as-database, no fake login — every record (customers, purchases,
installments, payments, Terms & Conditions) lives in your own live Supabase database.

This README is the exact path from "code on my computer" to "live at a public URL."

---

## What's included in this build

- Public site: home, `/login`, `/terms`, `/privacy`, `/contact`
- Customer Google login (Supabase Auth) → onboarding (personal details, selfie, Aadhaar front/back
  to a **private** storage bucket, nominee, Terms & Privacy consent) → auto-generated Customer ID
  (`VFA-000001`, …) → dashboard with live purchase/payment summary
- Admin portal (email/password login): dashboard, customer list + KYC review (signed URLs, never
  public links), new-purchase form that auto-generates the installment schedule, payment recording
  (updates installments/purchase status live), and a **Terms & Conditions / Privacy Policy CMS**
  with Draft → Preview → Publish → Archive and full version history — publishing does **not**
  require a code change or redeploy.
- Row Level Security on every table: a customer can only ever see their own data; Aadhaar images
  are in a private bucket accessible only to the owning customer and admins via short-lived signed URLs.

**Not yet built in this pass** (the spec has 93 sections — this is the working core, not the whole
thing): receipt/invoice PDF generation, WhatsApp share integration, SMS/email due-date reminders,
company-settings admin page, granular ADMIN vs VIEWER permission screens beyond the role check
already enforced in the API/RLS layer. The schema and patterns here make all of those straightforward
additions — ask and I'll build any of them next.

---

## 1. Push this code to a real GitHub repository

```bash
cd vasantham
git init
git add .
git commit -m "Initial commit: Vasantham Furniture & Home Appliances platform"
gh repo create vasantham-furniture --private --source=. --push
# or manually: create an empty repo on github.com, then
#   git remote add origin https://github.com/<you>/vasantham-furniture.git
#   git branch -M main && git push -u origin main
```

## 2. Create a real Supabase project

1. Go to https://supabase.com/dashboard → **New Project**.
2. Once it's provisioned, open **SQL Editor** and run, in this exact order:
   - `supabase/schema.sql`
   - `supabase/policies.sql`
   - `supabase/storage.sql`
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never commit this)

## 3. Enable Google OAuth (real, not mock)

1. In [Google Cloud Console](https://console.cloud.google.com/), create an **OAuth 2.0 Client ID**
   (Web application).
2. Authorized redirect URI — get the exact value from Supabase:
   **Supabase Dashboard → Authentication → Providers → Google** shows the callback URL, typically:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Also add your production URL's callback: `https://<your-vercel-domain>/auth/callback`
4. Paste the Google **Client ID** and **Client Secret** into Supabase → Authentication → Providers →
   Google, and toggle it **on**.

## 4. Create your first SUPER_ADMIN

Admins sign in with email/password (not Google) at `/admin/login`. To create the first one:

1. Supabase Dashboard → **Authentication → Users → Add User** (set an email + password).
2. Copy that user's UUID, then in the SQL Editor:

```sql
insert into admin_users (auth_user_id, full_name, email, role)
values ('paste-the-auth-user-uuid-here', 'Your Name', 'admin@example.com', 'SUPER_ADMIN');
```

## 5. Publish an initial Terms & Conditions and Privacy Policy

Onboarding won't let a customer finish until a **PUBLISHED** version of each exists. Log in at
`/admin/login`, go to **Settings → Terms & Conditions**, create a draft (e.g. version `1.0`), and
click **Publish**. Repeat for **Privacy Policy**.

## 6. Local development

```bash
cd vasantham
npm install
cp .env.example .env.local   # fill in the 4 values from steps 2–3
npm run dev
```

Open http://localhost:3000. Local dev still talks to your **real** Supabase project — there is no
offline/mock mode, exactly as specced.

## 7. Deploy to Vercel (production, publicly online)

```bash
npm install -g vercel
vercel login
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production   # e.g. https://vasantham-furniture.vercel.app
vercel --prod
```

Or connect the GitHub repo directly in the Vercel dashboard (Import Project → pick the repo → add
the same 4 environment variables → Deploy). Every push to `main` then redeploys automatically.

Once deployed, add the production callback URL (`https://<your-domain>/auth/callback`) to both
Google Cloud Console and Supabase's Google provider settings, matching step 3.

---

## Data flow (matches the spec)

```
Internet → Vercel → Next.js → Supabase Auth → Supabase Postgres (+ RLS) → Supabase Storage
```

- Customers authenticate with **Google via Supabase Auth**; a `customers` row is created on first
  login only (no duplicates — unique on `auth_user_id`).
- The Customer ID (`VFA-000001…`) is generated **server-side by a Postgres sequence/function**,
  never chosen by the customer, and never changes.
- Aadhaar and selfie images go to the **private** `customer-documents-private` bucket; RLS +
  storage policies mean a customer can only reach their own folder, and admins reach files only via
  short-lived signed URLs generated server-side.
- Every payment goes through the `record_payment()` Postgres function, which allocates the amount
  across pending installments, updates their status, and auto-closes the purchase when fully paid —
  so the customer dashboard and admin dashboard are always reading the same live numbers.
- Terms & Conditions and Privacy Policy are **rows in Supabase**, versioned (`DRAFT` → `PUBLISHED` →
  `ARCHIVED`, only one `PUBLISHED` per doc type, enforced by a unique index), with an append-only
  `policy_acceptances` table so historical consent is never lost when a new version is published.

## Security notes

- `SUPABASE_SERVICE_ROLE_KEY` must only ever be set as a **server** environment variable (Vercel
  project settings), never `NEXT_PUBLIC_*`, and never committed to git.
- All financial and KYC writes happen through server-side API routes or Postgres functions running
  under RLS — the browser never has enough privilege to fabricate a payment or purchase.
- Before go-live with real customer Aadhaar data, have this reviewed against current UIDAI and
  Indian KYC/privacy requirements — that legal review is outside what a codebase can certify.
