# Mi-Comunidad — project conventions

Digital platform for Spanish *comunidades de propietarios*. Mobile-first PWA for
presidentes and vecinos. Product docs live in `docs/`.

@AGENTS.md

## Stack

- **Next.js 16** (App Router, `src/`, Turbopack). Middleware is `src/proxy.ts` (Next 16 naming).
  `cacheComponents` is **off**: pages are dynamic by default; don't add `"use cache"`.
  Route params/searchParams are Promises — use the global `PageProps<"/route">` / `LayoutProps` helpers.
- **Supabase** (EU/Frankfurt): Auth (phone OTP, email OTP, Google OAuth) + Storage. We do **not** use
  Supabase from the client for data — all data goes through Prisma on the server.
- **Prisma 7**: connection URL lives in `prisma.config.ts` (loads `.env` via dotenv), runtime client uses
  `@prisma/adapter-pg` (`src/lib/db.ts`). Client is generated to `src/generated/prisma` (gitignored,
  generated on `postinstall`). Import from `@/generated/prisma/client` (server) or `@/generated/prisma/enums` (client-safe).
- **Tailwind v4 + shadcn/ui** (radix base). Design tokens in `src/app/globals.css`.
- **Stripe** for subscriptions, **Resend** for email, **Vercel** for hosting.

## Conventions

- **UI copy in Spanish** (es-ES). Code, comments, identifiers and commits in English.
- **Money is EUR cents (`Int`)**. Format with `formatCents`, parse user input with `parseEurosToCents` (`src/lib/format.ts`).
- Ownership coefficients are `Decimal(7,4)` percentages that should sum to 100 per comunidad.
- Dates shown in `Europe/Madrid` via helpers in `src/lib/format.ts`.
- **Authorization**: every server action and page calls `requireMember(comunidadId, roles?)` from
  `src/lib/auth.ts` — never trust IDs from forms without scoping queries by `comunidadId`.
  Role groups live in `src/lib/roles.ts` (`MANAGER_ROLES`, `FINANCE_ROLES`, `BOARD_ROLES`).
  The proxy only does an optimistic session check.
- Mutations are **server actions** in a colocated `actions.ts` (`"use server"`), validated with **zod v4**,
  returning `ActionState` (`src/lib/validation.ts`). Client forms use `useActionState` + helpers in
  `src/components/app/form.tsx`.
- Notifications must never throw and break the triggering action (`sendEmail` returns a boolean).
- Comunidad-scoped pages live under `src/app/c/[id]/…`; nav items in `src/components/app/app-nav.tsx`.

## Commands

```bash
npm run dev          # local dev
npm run lint         # eslint
npm run typecheck    # next typegen && tsc
npm test             # vitest (domain logic: LPH rules, cuotas)
npm run build        # production build
npm run db:migrate   # create/apply migrations (uses DIRECT_URL)
npm run db:deploy    # apply migrations in prod
npm run db:seed      # demo data (idempotent): "C. P. Gran Vía 42" + extra comunidades
```

New migrations: edit `prisma/schema.prisma`, then `npm run db:migrate -- --name <name>` against a dev DB.

## Git

- Conventional commits (`feat:`, `fix:`, `chore:`…). Never push to `main`; one branch + PR per phase.

## Domain notes

- LPH logic (quorum, majorities, notice periods) is pure and unit-tested in `src/lib/lph.ts`.
  Ordinary juntas require ≥ 6 days notice (art. 16.3, enforced); the UI recommends 15.
  Owners in arrears at the start of a junta cannot vote and are excluded from majorities (art. 15.2).
- Cuotas: one `Cuota` row per unit/month (or derrama installment), idempotent via `Cuota.key`.
  Overdue is computed (`PENDING` + past `dueDate`), not stored. Derramas split by coefficient with the
  largest-remainder method (`splitByCoefficient`) so cents always add up.
- Daily cron `/api/cron/daily` (Vercel, `CRON_SECRET`) generates cuotas and sends reminders.
- Billing: `Comunidad.plan` + `subscriptionStatus` mirror Stripe (webhook `/api/webhooks/stripe`, idempotent via
  `StripeEvent`). What a comunidad can do is derived by `computeEntitlements` (`src/lib/entitlements.ts`):
  14-day in-app trial of Comunidad features, Gratis afterwards, read-only when over the plan's unit limit.
  Gate server actions with `requireMember(id, roles, { feature })` or `{ write: true }`.
  Lifecycle changes are logged to `BillingEvent` (MRR analytics). Create Stripe prices with `scripts/stripe-setup.ts`.
- Platform admin at `/admin`: guarded by `requireAdmin()` (`src/lib/admin.ts`) against `ADMIN_EMAILS`
  (empty = nobody, fail closed; non-admins get a 404). Revenue maths in `src/lib/revenue.ts` (unit-tested).
- Notifications go through `notifyMembers` (`src/lib/notifications.ts`): WhatsApp (Meta Cloud API template, opt-in per
  member) and/or email (Resend), logged in `NotificationLog`. Legal notices (convocatorias, debt reminders, actas,
  billing) always also go by email. Lifecycle emails to presidents live in `src/lib/retention.ts` and respect
  `User.productEmails`.
- GDPR: `/cuenta` offers data export (`/cuenta/exportar`) and erasure (anonymisation; presidents must hand over first).
  Legal identity for `/privacidad` and `/terminos` comes from `src/lib/legal.ts` (fill in before launch).
