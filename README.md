# mi-comunidad

> Digital platform for comunidades de propietarios in Spain — replacing the WhatsApp + Excel + papel-en-el-portal workflow with a mobile-first tool any presidente can use.

## Documentation

- [Product Strategy](docs/product-strategy.md) — vision, V2MOM, and market positioning
- [Product Plan](docs/product-plan.pdf) — roadmap and delivery plan
- [Screens — Core](docs/screens-core.pdf) — core POC wireframes
- [Screens — Invite & Transfer](docs/screens-invite-transfer.pdf) — onboarding, invite, and transfer flows
- [CLAUDE.md](CLAUDE.md) — engineering conventions

## Tech Stack

- **Next.js 16** (App Router) — mobile-first PWA
- **Supabase** (EU/Frankfurt) — auth (phone OTP, Google) and storage
- **Prisma 7** — type-safe ORM with `@prisma/adapter-pg`
- **Tailwind CSS v4 + shadcn/ui** — UI
- **Stripe** — subscriptions · **Resend** — email · **Vercel** — hosting

## Getting started

```bash
cp .env.example .env    # fill in Supabase + database credentials
npm install             # also runs prisma generate
npm run db:deploy       # apply migrations
npm run dev
```

### Supabase setup

1. Create a project in **EU Central (Frankfurt)**.
2. Auth → Providers: enable **Phone** (Twilio/MessageBird SMS), **Email** (OTP) and **Google**.
3. Auth → URL configuration: add `http://localhost:3000/auth/callback` and your production `/auth/callback`.
4. Copy the pooled (6543) connection string to `DATABASE_URL` and the session (5432) one to `DIRECT_URL`.

## Features

- **Onboarding:** phone OTP, email OTP and Google sign-in; create a comunidad and become presidente; invite vecinos by link, QR poster or per-unit invitation.
- **Communication:** announcements (pinned, urgent, read receipts) and incidencias with photos and status tracking. Notifications go by WhatsApp and email.
- **Documents:** actas, estatutos, seguro and presupuestos, organised by year and category.
- **Directory:** vecinos with floor and door. Contact details are visible only to the board. The presidency can be handed over.
- **Juntas:** LPH-compliant convocatorias, RSVP, proxy delegation, live voting weighted by coefficient, quorum tracking, and automatic actas.
- **Cuotas:** monthly fees, paid/pending/overdue tracking, reminders, and a derrama calculator.
- **Billing:** Stripe subscriptions (Gratis / Comunidad / Pro / Administrador) with a 14-day trial and plan gating.
- **Platform admin (`/admin`):** comunidades and a revenue dashboard (MRR, ARR, churn, trial conversion, NPS).
- **Engagement:** onboarding checklist, NPS survey, lifecycle emails, a referral programme (one free month per referred comunidad that subscribes), and GDPR self-service (data export and erasure).

## Scripts

```bash
npm run dev | build | lint | typecheck | test
npm run db:migrate | db:deploy | db:seed
npx tsx scripts/stripe-setup.ts   # create Stripe products/prices
```

## Deployment (Vercel)

Set every variable from `.env.example` in Vercel, using the `fra1` region (already set in `vercel.json`). Run `npm run db:deploy` against production, then:

- point a Stripe webhook at `/api/webhooks/stripe`;
- set `CRON_SECRET` so the daily cron (`/api/cron/daily`) can run;
- get the WhatsApp template `mi_comunidad_aviso` approved in Meta Business Manager.
