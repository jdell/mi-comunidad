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
