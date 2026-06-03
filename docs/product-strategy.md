# Vecinos — Phase 1: Product Strategy

> Private community management platform for Comunidades de Propietarios in Spain

**Date:** 3 June 2026 | **Status:** DRAFT

---

## V2MOM

### Vision
Become the default digital platform for self-managed comunidades de vecinos in Spain, replacing the WhatsApp + Excel + papel-en-el-portal workflow with a mobile-first tool that any presidente can use.

### Values
1. **Vecino sovereignty** — the comunidad owns its data, decides its rules, controls access. No lock-in.
2. **Simplicity first** — a presidente who uses WhatsApp can manage the comunidad from their phone. Zero training needed.
3. **Legal compliance built-in** — convocatorias, actas, and votaciones comply with the Ley de Propiedad Horizontal (LPH) out of the box.
4. **Transparent finances** — every vecino can see the presupuesto, their cuota status, and where the money goes.
5. **Spanish-first, scalable** — built for Spain's legal framework; architecture supports Portugal, LatAm HOAs later.

### Methods
- Mobile-first PWA (install from browser, works offline for announcements)
- WhatsApp Business API integration for notifications (not another app to download)
- Freemium model — free for small comunidades (< 10 units), paid for larger ones
- Self-service onboarding — presidente registers, invites vecinos via WhatsApp link
- Administrador tier — professional administrators manage multiple comunidades from one dashboard

### Obstacles
- Low willingness to pay in small comunidades (presidente is a volunteer, budget is tight)
- Adoption barrier — convincing 50+ vecinos to use yet another app
- Legal complexity — LPH requirements vary by autonomous community
- Administradores as gatekeepers — they may resist tools that make them replaceable
- Existing competitors (Fincas.app, Fynkus, Don Comunidad) with head starts

### Measures (6-month targets)
- KR1: 50–100 comunidades onboarded
- KR2: 500+ active vecinos
- KR3: 20+ juntas managed through the platform
- KR4: NPS > 40
- KR5: 5 paid comunidades (Pro tier)
- KR6: < 3 min from convocatoria to all vecinos notified

---

## Market analysis

### Total addressable market (TAM)

Spain has approximately **900,000 comunidades de propietarios** managing over 25 million housing units. Of these:

| Segment | Count | Avg units | Description |
|---------|-------|-----------|-------------|
| Small (< 10 units) | ~400,000 | 5 | Self-managed, no administrador |
| Medium (10–50 units) | ~350,000 | 25 | Mix of self-managed and administered |
| Large (50+ units) | ~150,000 | 100+ | Always professionally administered |

**TAM:** 900,000 comunidades × €60/year avg = **€54M ARR**

**SAM (serviceable):** Small + medium comunidades willing to self-manage = ~500,000 × €60 = **€30M ARR**

**SOM (obtainable, year 1–2):** 0.1% penetration = 500 comunidades × €60 = **€30K ARR**

### Why now
- COVID normalised digital juntas (RDL 8/2021 temporarily allowed remote voting; many comunidades want it permanent)
- WhatsApp fatigue — grupo de la comunidad is the most muted chat on every phone
- Generational shift — younger propietarios (30–45) expect digital tools
- Administrador fees rising — small comunidades increasingly self-manage to save €100–300/month
- Spanish proptech boom — investors funding vertical SaaS in real estate

### Competitive landscape

| Competitor | Strengths | Weaknesses | Threat |
|-----------|-----------|------------|--------|
| **Fincas.app** | Most complete feature set, integrations with banks | Desktop-oriented, complex UI, designed for administradores not vecinos | High |
| **Fynkus** | Good mobile app, modern UI | Pricey (€1.50/unit/month), focused on administered comunidades | Medium |
| **Don Comunidad** | Free tier, simple | Very basic, no junta management, limited integrations | Low |
| **Properfy** | AI features, document scanning | Early stage, small user base | Low |
| **WhatsApp groups** | Everyone already has it, zero friction | No structure, no voting, no finances, no document storage | Indirect high |

**Key differentiator:** The only platform designed for **self-managed comunidades** (no administrador needed) with **WhatsApp-native notifications** and **LPH-compliant junta management** built in. Competitors target administradores; we target presidentes.

---

## Personas

### Persona 1: María — La presidenta resignada (buyer + daily user)

**Demographics:** Age 42, marketing professional, owner of a 3-bedroom flat in a 20-unit building in Valencia. Elected presidenta because nobody else wanted to do it.

**Current workflow:** WhatsApp group for announcements (30% read rate), Excel spreadsheet for cuotas (shared via email, nobody opens it), paper convocatorias in the buzones (half don't arrive), handwritten actas at juntas (illegible, never distributed).

**Pain points:**
- Spends 5+ hours/month on comunidad admin — unpaid
- Cannot get quorum for juntas — vecinos don't show up or send valid proxies
- Three vecinos owe 6+ months of cuotas — awkward to chase them personally
- The last junta's acta was challenged because quorum wasn't properly documented
- The building's ITE inspection is overdue and she doesn't know what to do

**Motivation:** "I just want to do my year as presidenta, keep the building running, and hand it over without drama."

**How we win her:** Free tool, 10-minute setup, WhatsApp notifications to all vecinos, auto-generated actas with quorum tracking.

### Persona 2: Antonio — El moroso involuntario (end user)

**Demographics:** Age 55, retired civil servant, owner of a ground-floor flat in a 40-unit building in Málaga. Not on WhatsApp (uses SMS and email).

**Current workflow:** Pays cuotas by bank transfer when he remembers. Attends some juntas but misses convocatorias because they go to the WhatsApp group he's not in. Gets angry when he discovers decisions were made without his knowledge.

**Pain points:**
- Misses announcements because he's not in the WhatsApp group
- Doesn't know he's behind on cuotas until the administrador sends a burofax
- Wants to vote on important matters but can't always attend juntas
- Doesn't understand the presupuesto breakdown

**Motivation:** "I pay my cuota, I want to know what happens with my money, and I want to vote when it matters."

**How we win him:** SMS + email notifications (not just WhatsApp), clear cuota status dashboard, remote voting for juntas.

### Persona 3: Lucía — La administradora moderna (power user, B2B)

**Demographics:** Age 35, runs a small administración de fincas (manages 25 comunidades) in Madrid. Uses Gesfincas (legacy software from 2008) and hates it.

**Current workflow:** Desktop software for accounting, separate email tool for convocatorias, WhatsApp for each comunidad, Excel for tracking incidencias.

**Pain points:**
- Managing 25 WhatsApp groups is chaos
- Gesfincas crashes weekly and has no mobile app
- Vecinos call her directly for things they could look up themselves
- Generating the IVA quarterly tax report takes a full day

**Motivation:** "I want one tool that does everything so I stop juggling five apps."

**How we win her:** Multi-comunidad dashboard, automated cuota reminders (less manual chasing), vecino self-service portal (reduces phone calls).

---

## Pricing model

### Recommended tiers

| Tier | Price | Units | Features |
|------|-------|-------|----------|
| **Gratis** | €0/month | ≤ 10 units | Announcements, incidencias, document storage (1 GB), basic junta convocatoria |
| **Comunidad** | €9/month | ≤ 50 units | Everything in Gratis + cuota tracking, automatic reminders, remote voting, acta generation, 10 GB storage |
| **Comunidad Pro** | €19/month | ≤ 200 units | Everything in Comunidad + proveedor marketplace, booking system (piscina, pádel), analytics, priority support, custom branding |
| **Administrador** | €99/month | Unlimited comunidades | Multi-comunidad dashboard, bulk operations, tax reporting, API access, white-label option |

**Pricing rationale:**
- €9/month = less than one vecino's café con leche budget. Split across 20 vecinos = €0.45/month each. The administrador they're replacing costs €100–300/month.
- €19/month = still cheaper than any administrador. For a 50-unit building with €200/month admin fee, this saves €181/month.
- Free tier is critical — self-managed small buildings have zero budget. They're the word-of-mouth engine.

**Revenue projections (conservative):**

| Month | Free | Comunidad | Pro | Admin | MRR |
|-------|------|-----------|-----|-------|-----|
| 3 | 30 | 0 | 0 | 0 | €0 |
| 6 | 60 | 5 | 0 | 0 | €45 |
| 9 | 100 | 15 | 3 | 1 | €291 |
| 12 | 150 | 30 | 8 | 3 | €719 |
| 18 | 250 | 60 | 20 | 8 | €1,712 |
| 24 | 400 | 100 | 40 | 15 | €3,145 |

---

## User acquisition strategy

### Phase 0: Seed (months 1–2)
**Goal:** 10 comunidades onboarded (your own building + friends/family + cold outreach)

- Start with your own comunidad — dogfood the product, generate the first case study
- Ask 5 friends who are presidentes to try it
- Post in local neighbourhood Facebook groups and foros (ForoCoches has a hilo de comunidades)
- Create a landing page: vecinos.app / micomunidad.es / comunidadigital.es

### Phase 1: Local traction (months 3–6)
**Goal:** 50 comunidades, 500 vecinos

- **WhatsApp virality:** When a presidente invites their vecinos via WhatsApp, each vecino sees the platform. Some are presidentes of their own buildings. Built-in network effect.
- **SEO content:** Blog posts targeting "cómo organizar una junta de vecinos", "modelo de acta de comunidad de propietarios", "calculadora de derrama". These are high-intent searches with low competition.
- **Partnership with colegios de administradores:** Offer the Administrador tier free for 3 months. They bring 10–25 comunidades each.
- **Local press:** "App gratuita para gestionar tu comunidad de vecinos" — local newspapers love this angle.

### Phase 2: Scale (months 6–12)
**Goal:** 200 comunidades, 2,000 vecinos, 5 paying administradores

- **Referral programme:** Presidentes who invite another comunidad get 3 months free of the Comunidad tier
- **Templates library:** Free downloadable templates (convocatoria, acta, presupuesto) branded with the platform. SEO magnet.
- **Google Ads:** Target "software comunidad de vecinos", "app comunidad de propietarios" — low CPC, high intent
- **Administrador partnerships:** Offer co-branded version for administradores who bring their portfolio

### Phase 3: Expansion (months 12–24)
- Portugal (condomínios — very similar legal framework)
- LatAm (propiedad horizontal in Colombia, Argentina, Chile — same concept, different regulations)
- Vertical features: energy efficiency (certificado energético tracking), EV charger management (new LPH reform), solar panel comunidades

---

## MVP scope (months 1–3)

### P0 — Must have (month 1–2)

| Feature | Description |
|---------|-------------|
| Comunidad registration | Presidente registers, enters building address, number of units, coeficientes |
| Vecino invitations | Generate WhatsApp/SMS/email invitation links. Vecino signs up with phone number |
| Announcements | Post to all vecinos. WhatsApp notification + in-app + email |
| Incidencia reporting | Report issue with photo, assign status, notify affected vecinos |
| Document storage | Upload PDFs (actas, presupuestos, seguros). Organised by year/type |
| Basic junta | Create convocatoria with agenda, send 15 days in advance (LPH), track RSVP |
| Mobile-first PWA | Installable from browser, works on any phone, no app store needed |

### P1 — Should have (month 2–3)

| Feature | Description |
|---------|-------------|
| Cuota tracking | Mark paid/unpaid per vecino per month. Dashboard showing who owes what |
| Automatic reminders | WhatsApp/SMS reminder to morosos (configurable frequency) |
| Junta voting | In-app voting during junta (simple majority, qualified majority per LPH) |
| Proxy delegation | Vecino delegates vote to another vecino digitally |
| Acta auto-generation | Generate PDF acta from junta (attendance, votes, agreements) |
| Maintenance calendar | Track ITE, fire extinguishers, lift maintenance, seguro renewal |

### P2 — Nice to have (month 3+)

| Feature | Description |
|---------|-------------|
| Remote voting | Vote without attending junta (legally complex — depends on estatutos) |
| Derrama calculator | Input total amount, calculate each vecino's share by coeficiente |
| Proveedor directory | Request quotes from vetted electricians, plumbers, cleaners |
| Booking system | Reserve piscina, sala de reuniones, pista de pádel |
| Package notifications | Portero marks package arrived, vecino gets WhatsApp notification |
| AI copilot | "Can the comunidad charge me for this?" → answers citing LPH articles |
| Expense tracker | Log expenses with receipt photos, categorise, year-end summary |

---

## Tech stack

Reusing the same stack as Mensajeras (proven, deployed, familiar):

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 16 (App Router) | Same as mensajeras, oscar.portal. SSR for SEO landing pages. |
| Database | Supabase (PostgreSQL) | Auth, RLS, Realtime, Storage. Same as mensajeras. |
| Auth | Supabase Auth (phone OTP + Google) | Phone-first for vecinos. Same flow as mensajeras. |
| Notifications | WhatsApp Business API + Resend (email) | WhatsApp is the primary channel — vecinos don't install apps. |
| Payments | Stripe | Cuota collection (future) + subscription billing |
| Hosting | Vercel | Auto-deploy from GitHub, preview URLs for PRs |
| ORM | Prisma | Same as mensajeras |
| UI | Tailwind CSS + shadcn/ui | Same as oscar.portal |
| Real-time | Supabase Realtime | Live junta voting, bid-style real-time updates |

**Key architectural decision:** Single Next.js app with role-based routing. Presidente sees admin features, vecinos see read-only dashboard + voting. No separate admin app needed for small comunidades. Administradores get a multi-tenant dashboard (separate route group).

---

## Compliance (LPH + GDPR)

### Ley de Propiedad Horizontal (LPH)

| Requirement | How we handle it |
|-------------|-----------------|
| Convocatoria 15 days before junta (art. 16) | System enforces minimum 15-day notice; records delivery timestamp per vecino |
| Quorum requirements (art. 17) | Auto-calculates quorum by coeficiente; flags when quorum is/isn't met |
| Acta must include attendees, votes, agreements (art. 19) | Auto-generated from in-app data; PDF with digital signatures |
| Morosity notification before legal action (art. 21) | Automated reminders with delivery receipts; export for legal proceedings |
| Coeficiente de participación determines vote weight (art. 5) | Stored per unit; all voting calculations weighted by coeficiente |
| Presidente can delegate to vicepresidente (art. 13) | Role delegation built into the access model |

### GDPR / LOPDGDD

| Requirement | Implementation |
|-------------|---------------|
| Legal basis | Legitimate interest (LPH obligations) + consent for notifications |
| Data minimisation | Only collect name, unit number, contact (phone/email). No ID documents. |
| Right to access/erasure | Self-service data export + deletion. Vecinos can leave the platform. |
| Data processing agreement | Template DPA for administradores who process on behalf of comunidades |
| Cookie consent | Cookie banner with granular opt-in (analytics only — no tracking) |
| EU hosting | Supabase EU region (Frankfurt). Vercel EU edge. |

---

## Key metrics dashboard

| Category | Metric | Target (6 months) |
|----------|--------|-------------------|
| Acquisition | Comunidades registered | 50–100 |
| Acquisition | Vecinos registered | 500+ |
| Activation | Comunidades with 5+ vecinos active | 30+ |
| Engagement | Announcements sent / week | 50+ |
| Engagement | Incidencias reported / month | 100+ |
| Retention | Comunidad monthly retention | > 85% |
| Revenue | Paid comunidades | 5+ |
| Revenue | MRR | €45+ |
| Satisfaction | NPS | > 40 |
| Efficiency | Time from convocatoria to all notified | < 3 min |

---

## Roadmap summary

| Month | Milestone | Key deliverable |
|-------|-----------|----------------|
| 1 | Foundation | Auth, comunidad registration, vecino invitations, announcements, PWA |
| 2 | Core loop | Incidencias, document storage, basic junta convocatoria |
| 3 | Junta MVP | Voting, proxy, acta generation, cuota tracking |
| 4 | Beta feedback | 10+ comunidades onboarded, iterate on feedback |
| 5 | Growth | WhatsApp virality loop, SEO content, referral programme |
| 6 | Monetisation | Stripe integration, paid tiers enforced, administrador dashboard |
| 9 | Scale | 100+ comunidades, proveedor marketplace, booking system |
| 12 | Expansion | Portugal market, AI copilot, energy/EV features |

---

## Go / No-Go criteria (before building)

Before committing to development, validate:

1. **Demand signal:** Talk to 10 presidentes. Do 5+ say they'd use a free tool? Do 2+ say they'd pay €9/month?
2. **WhatsApp API feasibility:** Confirm Meta Business API allows comunidad notifications at acceptable cost (currently ~€0.03/message in Spain)
3. **Legal validation:** Confirm with a lawyer that digital convocatorias and in-app voting are valid under the applicable LPH articles and the comunidad's estatutos
4. **Domain availability:** Secure vecinos.app or micomunidad.es or similar
5. **Differentiation check:** Download Fincas.app and Don Comunidad. Use them as a presidente. Confirm they're painful enough that a simpler alternative wins.

---

*Strategy document generated 3 June 2026. Following the Lexit/Mensajeras playbook structure for consistency.*
