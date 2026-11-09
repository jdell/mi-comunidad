/**
 * Demo data: "C. P. Gran Vía 42" (Madrid) with 20 units, members, announcements,
 * incidencias, cuotas, a derrama, a past junta with acta and an upcoming one,
 * plus a handful of extra comunidades so the admin revenue dashboard has data.
 *
 * Idempotent: removes previous demo data (invite codes DEMO*, users *@demo.micomunidad.app).
 * Run: npm run db:seed
 *
 * Set SEED_SUPABASE_USERS=true (with SUPABASE_SERVICE_ROLE_KEY) to also create a real
 * Supabase auth user for the demo president so you can sign in as them by email OTP.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { Prisma } from "../src/generated/prisma/client";
import { addMonths, cuotaKey, dueDateFor, periodOf, splitByCoefficient, splitInstallments } from "../src/lib/cuotas";
import { db } from "../src/lib/db";
import { PLANS, type PlanId } from "../src/lib/plans";

const DAY = 86_400_000;
const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * DAY);
const daysFromNow = (n: number) => new Date(now.getTime() + n * DAY);
const DEMO_DOMAIN = "demo.micomunidad.app";
const uuid = (n: number) => `de300000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const VECINOS = [
  "María García", "Pedro Sánchez Ruiz", "Laura Martínez", "Antonio López", "Sofía Romero", "Carlos Ruiz",
  "Elena Navarro", "Javier Torres", "Lucía Fernández", "Rosa Pérez", "Jorge Moreno", "Carmen Díaz",
  "Pablo Jiménez", "Isabel Álvarez", "Miguel Gómez", "Ana Muñoz", "David Castro", "Marta Ortega",
];

async function presidentUserId() {
  const email = `presidenta@${DEMO_DOMAIN}`;
  if (process.env.SEED_SUPABASE_USERS !== "true" || !process.env.SUPABASE_SERVICE_ROLE_KEY) return uuid(1);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: "María García" } });
  if (error || !data.user) throw error ?? new Error("Could not create Supabase user");
  console.log(`Created Supabase user ${email} (sign in with email OTP)`);
  return data.user.id;
}

async function reset() {
  await db.comunidad.deleteMany({ where: { inviteCode: { startsWith: "DEMO" } } });
  await db.user.deleteMany({ where: { email: { endsWith: `@${DEMO_DOMAIN}` } } });
}

async function seedGranVia() {
  const presidentId = await presidentUserId();
  const users = await Promise.all(
    VECINOS.map((name, i) =>
      db.user.create({
        data: {
          id: i === 0 ? presidentId : uuid(100 + i),
          name,
          email: i === 0 ? `presidenta@${DEMO_DOMAIN}` : `vecino${i}@${DEMO_DOMAIN}`,
          phone: `+3460000${String(1000 + i)}`,
        },
      }),
    ),
  );

  // 5 floors × 4 doors. Corner flats (A, D) are larger: 5.5 % vs 4.5 %.
  const unitsData = [];
  for (let floor = 1; floor <= 5; floor++) {
    for (const door of ["A", "B", "C", "D"]) {
      unitsData.push({ label: `${floor}º${door}`, floor: String(floor), door, coefficient: new Prisma.Decimal(door === "A" || door === "D" ? "5.5" : "4.5") });
    }
  }

  const createdAt = daysAgo(120);
  const comunidad = await db.comunidad.create({
    data: {
      name: "C. P. Gran Vía 42",
      address: "Calle Gran Vía 42",
      city: "Madrid",
      postalCode: "28013",
      cif: "H87654321",
      unitsCount: unitsData.length,
      inviteCode: "DEMO2026",
      cuotaMode: "FIXED",
      cuotaFixedCents: 6000,
      cuotaDueDay: 10,
      plan: "COMUNIDAD",
      subscriptionStatus: "ACTIVE",
      trialEndsAt: new Date(createdAt.getTime() + 14 * DAY),
      currentPeriodEnd: daysFromNow(18),
      createdAt,
      units: { createMany: { data: unitsData } },
    },
    include: { units: { orderBy: [{ floor: "asc" }, { label: "asc" }] } },
  });
  const units = comunidad.units;

  // 18 of 20 units registered; 5ºC and 5ºD still unclaimed.
  const roles: Record<number, "PRESIDENT" | "SECRETARY" | "TREASURER"> = { 0: "PRESIDENT", 5: "SECRETARY", 8: "TREASURER" };
  const members = [];
  for (const [i, user] of users.entries()) {
    members.push(
      await db.comunidadMember.create({
        data: {
          comunidadId: comunidad.id,
          userId: user.id,
          unitId: units[i]!.id,
          role: roles[i] ?? "VECINO",
          displayName: user.name!,
          email: user.email,
          phone: user.phone,
          joinedAt: daysAgo(118 - i * 3),
        },
      }),
    );
  }
  const [maria, , laura, antonio, , carlos] = members;

  await db.invitation.create({
    data: { comunidadId: comunidad.id, code: "DEMOINV5C1", unitId: units[18]!.id, name: "Raúl Vega", email: `raul@${DEMO_DOMAIN}`, createdById: users[0]!.id, sentAt: daysAgo(3), expiresAt: daysFromNow(27) },
  });

  // Announcements
  const announcements = [
    { title: "Corte de agua mañana de 9:00 a 14:00", body: "La empresa de fontanería realizará trabajos en la acometida general. Recomendamos guardar agua para esas horas.", pinned: true, urgent: true, at: daysAgo(1) },
    { title: "Revisión anual del ascensor", body: "El técnico de Thyssen pasará el jueves por la mañana. El ascensor estará parado unas dos horas.", at: daysAgo(6) },
    { title: "Convocatoria de junta ordinaria", body: "Ya está disponible la convocatoria de la junta ordinaria. Podéis confirmar asistencia o delegar el voto desde la app.", at: daysAgo(10) },
    { title: "Bienvenidos a Mi Comunidad", body: "A partir de ahora los avisos, incidencias y documentos de la comunidad estarán aquí. ¡Gracias por uniros!", at: daysAgo(110) },
  ];
  for (const a of announcements) {
    const created = await db.announcement.create({
      data: { comunidadId: comunidad.id, authorId: maria!.id, title: a.title, body: a.body, pinned: a.pinned ?? false, urgent: a.urgent ?? false, notifiedAt: a.at, recipientsCount: 17, createdAt: a.at },
    });
    const readers = members.slice(0, 10 + Math.floor(Math.random() * 7));
    await db.announcementRead.createMany({ data: readers.map((m) => ({ announcementId: created.id, memberId: m.id, readAt: a.at })) });
  }

  // Incidencias
  const ascensor = await db.incidencia.create({
    data: { comunidadId: comunidad.id, reporterId: antonio!.id, title: "Ascensor averiado", description: "Se queda parado entre el 2º y el 3º y hace un ruido fuerte al arrancar.", location: "ASCENSOR", priority: "URGENT", status: "IN_PROGRESS", assignedTo: "Thyssen", createdAt: daysAgo(2) },
  });
  await db.incidenciaUpdate.createMany({
    data: [
      { incidenciaId: ascensor.id, authorId: maria!.id, status: "IN_PROGRESS", note: "He llamado a Thyssen, vienen mañana a primera hora.", createdAt: daysAgo(2) },
      { incidenciaId: ascensor.id, authorId: antonio!.id, note: "Gracias, María. Esta mañana seguía igual.", createdAt: daysAgo(1) },
    ],
  });
  await db.incidencia.create({
    data: { comunidadId: comunidad.id, reporterId: laura!.id, title: "Gotera en el garaje, plaza 12", description: "Lleva goteando desde ayer, parece que viene de la bajante.", location: "GARAJE", priority: "NORMAL", status: "OPEN", createdAt: daysAgo(3) },
  });
  await db.incidencia.create({
    data: { comunidadId: comunidad.id, reporterId: members[12]!.id, title: "Puerta del garaje no cierra bien", description: "El mando funciona pero la puerta se queda a medio cerrar.", location: "GARAJE", status: "OPEN", createdAt: daysAgo(5) },
  });
  const bombilla = await db.incidencia.create({
    data: { comunidadId: comunidad.id, reporterId: carlos!.id, title: "Bombilla fundida en el portal", description: "La luz de la entrada no funciona.", location: "PORTAL", status: "RESOLVED", resolvedAt: daysAgo(6), createdAt: daysAgo(8) },
  });
  await db.incidenciaUpdate.create({ data: { incidenciaId: bombilla.id, authorId: maria!.id, status: "RESOLVED", note: "Cambiada por una LED.", createdAt: daysAgo(6) } });

  // Cuotas: last 6 months. Antonio (1ºD) owes the last 3, Jorge (3ºC) the current month.
  const currentPeriod = periodOf(now);
  const cuotaRows: Prisma.CuotaCreateManyInput[] = [];
  for (let m = -5; m <= 0; m++) {
    const period = addMonths(currentPeriod, m);
    const dueDate = dueDateFor(period, comunidad.cuotaDueDay);
    for (const [i, unit] of units.entries()) {
      const owes = (i === 3 && m >= -2) || (i === 10 && m === 0) || (i >= 18 && m >= -1);
      const paid = !owes && dueDate < now;
      cuotaRows.push({
        key: cuotaKey({ unitId: unit.id, kind: "ORDINARIA", period }),
        comunidadId: comunidad.id,
        unitId: unit.id,
        period,
        amountCents: comunidad.cuotaFixedCents,
        dueDate,
        status: paid ? "PAID" : "PENDING",
        paidAt: paid ? new Date(dueDate.getTime() - 3 * DAY) : null,
      });
    }
  }
  await db.cuota.createMany({ data: cuotaRows });

  // Derrama: terrace waterproofing, €12,000 in 6 installments from next month.
  const firstPeriod = addMonths(currentPeriod, 1);
  const derrama = await db.derrama.create({
    data: { comunidadId: comunidad.id, title: "Impermeabilización de la terraza", description: "Aprobada en la junta extraordinaria.", totalCents: 1_200_000, installments: 6, firstDueDate: dueDateFor(firstPeriod, 10) },
  });
  const shares = splitByCoefficient(1_200_000, units.map((u) => ({ id: u.id, coefficient: u.coefficient.toNumber() })));
  await db.cuota.createMany({
    data: shares.flatMap((s) =>
      splitInstallments(s.shareCents, 6).map((amountCents, i) => {
        const period = addMonths(firstPeriod, i);
        return {
          key: cuotaKey({ unitId: s.id, kind: "DERRAMA", period, derramaId: derrama.id, installment: i + 1 }),
          comunidadId: comunidad.id,
          unitId: s.id,
          kind: "DERRAMA" as const,
          period,
          derramaId: derrama.id,
          installment: i + 1,
          amountCents,
          dueDate: dueDateFor(period, 10),
        };
      }),
    ),
  });

  // Past junta (closed, acta published)
  const pastAt = daysAgo(75);
  const past = await db.junta.create({
    data: {
      comunidadId: comunidad.id,
      createdById: maria!.id,
      type: "EXTRAORDINARIA",
      status: "CERRADA",
      scheduledAt: pastAt,
      secondCallAt: new Date(pastAt.getTime() + 30 * 60_000),
      location: "Portal del edificio",
      convocadaAt: daysAgo(85),
      recipientsCount: 17,
      startedAt: new Date(pastAt.getTime() + 30 * 60_000),
      heldOnSecondCall: true,
      presidentName: maria!.displayName,
      secretaryName: carlos!.displayName,
      closedAt: new Date(pastAt.getTime() + 95 * 60_000),
      actaPublishedAt: daysAgo(74),
      actaNotes: "Varios vecinos solicitan que se pidan al menos tres presupuestos para futuras obras.",
      agendaItems: {
        create: [
          { order: 1, title: "Aprobación de la impermeabilización de la terraza y derrama de 12.000 €", majority: "SIMPLE", votingDone: true, result: "APPROVED", resolution: "Se aprueba el presupuesto de Impermeabilizaciones Centro S.L. por 12.000 € a pagar en 6 cuotas." },
          { order: 2, title: "Ruegos y preguntas", majority: "INFORMATIVE", votingDone: true, result: "NO_VOTE" },
        ],
      },
    },
    include: { agendaItems: true },
  });
  const attending = units.slice(0, 14);
  await db.juntaAttendance.createMany({
    data: attending.map((u, i) => ({ juntaId: past.id, unitId: u.id, type: i === 6 ? ("PROXY" as const) : ("IN_PERSON" as const), representativeName: i === 6 ? maria!.displayName : null })),
  });
  const item1 = past.agendaItems.find((i) => i.order === 1)!;
  await db.vote.createMany({
    data: attending.map((u, i) => ({ agendaItemId: item1.id, unitId: u.id, choice: i === 3 || i === 9 ? ("NO" as const) : i === 12 ? ("ABSTAIN" as const) : ("YES" as const), castByMemberId: maria!.id })),
  });

  // Upcoming junta (convocada)
  const upcomingAt = daysFromNow(20);
  upcomingAt.setUTCHours(17, 0, 0, 0);
  const upcoming = await db.junta.create({
    data: {
      comunidadId: comunidad.id,
      createdById: maria!.id,
      type: "ORDINARIA",
      status: "CONVOCADA",
      scheduledAt: upcomingAt,
      secondCallAt: new Date(upcomingAt.getTime() + 30 * 60_000),
      location: "Salón de actos, planta baja",
      convocadaAt: daysAgo(10),
      recipientsCount: 17,
      notes: "Se ruega puntualidad. Las cuentas del ejercicio están disponibles en Documentos.",
      agendaItems: {
        create: [
          { order: 1, title: "Lectura y aprobación, si procede, del acta de la junta anterior", majority: "SIMPLE" },
          { order: 2, title: "Aprobación del estado de cuentas del ejercicio 2026", majority: "SIMPLE" },
          { order: 3, title: "Aprobación del presupuesto 2027 y cuotas", majority: "SIMPLE" },
          { order: 4, title: "Instalación de puntos de recarga para vehículos eléctricos en el garaje", majority: "THREE_FIFTHS" },
          { order: 5, title: "Renovación de cargos", majority: "SIMPLE" },
          { order: 6, title: "Ruegos y preguntas", majority: "INFORMATIVE" },
        ],
      },
    },
  });
  await db.juntaRsvp.createMany({ data: members.slice(0, 12).map((m, i) => ({ juntaId: upcoming.id, memberId: m.id, attending: i !== 7 })) });
  await db.proxyDelegation.create({ data: { juntaId: upcoming.id, unitId: units[7]!.id, fromMemberId: members[7]!.id, toMemberId: maria!.id } });

  // Billing history: trial → Comunidad, paid monthly.
  const subscribedAt = new Date(createdAt.getTime() + 12 * DAY);
  await db.billingEvent.createMany({
    data: [
      { comunidadId: comunidad.id, type: "TRIAL_STARTED", plan: "COMUNIDAD", occurredAt: createdAt },
      { comunidadId: comunidad.id, type: "SUBSCRIBED", plan: "COMUNIDAD", mrrCents: 900, occurredAt: subscribedAt },
      ...[0, 1, 2, 3].map((m) => ({ comunidadId: comunidad.id, type: "PAYMENT_SUCCEEDED" as const, plan: "COMUNIDAD" as const, mrrCents: 900, amountCents: 1089, occurredAt: new Date(subscribedAt.getTime() + m * 30 * DAY) })),
    ],
  });

  return comunidad;
}

/** Extra comunidades with varied plans/history for admin analytics. */
async function seedOthers() {
  const others: { name: string; city: string; units: number; plan: PlanId; status: "ACTIVE" | "CANCELED" | "NONE" | "PAST_DUE"; ageDays: number; subscribedDaysAgo?: number; canceledDaysAgo?: number; upgradedDaysAgo?: number }[] = [
    { name: "C. P. Avenida del Puerto 15", city: "Valencia", units: 64, plan: "PRO", status: "ACTIVE", ageDays: 300, subscribedDaysAgo: 290 },
    { name: "Residencial Los Olivos", city: "Málaga", units: 120, plan: "ADMINISTRADOR", status: "ACTIVE", ageDays: 210, subscribedDaysAgo: 200 },
    { name: "C. P. Calle Mayor 3", city: "Sevilla", units: 8, plan: "GRATIS", status: "NONE", ageDays: 160 },
    { name: "C. P. Rambla 120", city: "Barcelona", units: 30, plan: "GRATIS", status: "CANCELED", ageDays: 240, subscribedDaysAgo: 228, canceledDaysAgo: 20 },
    { name: "Edificio Mirador", city: "Bilbao", units: 24, plan: "GRATIS", status: "NONE", ageDays: 5 },
    { name: "C. P. Plaza Nueva 7", city: "Zaragoza", units: 36, plan: "PRO", status: "ACTIVE", ageDays: 90, subscribedDaysAgo: 78, upgradedDaysAgo: 30 },
    { name: "C. P. Calle Real 21", city: "A Coruña", units: 18, plan: "COMUNIDAD", status: "PAST_DUE", ageDays: 130, subscribedDaysAgo: 117 },
    { name: "C. P. Paseo de la Castellana 200", city: "Madrid", units: 45, plan: "GRATIS", status: "NONE", ageDays: 40 },
  ];

  for (const [i, o] of others.entries()) {
    const createdAt = daysAgo(o.ageDays);
    const user = await db.user.create({ data: { id: uuid(500 + i), name: `Presidente ${o.city}`, email: `presidente${i}@${DEMO_DOMAIN}` } });
    const c = await db.comunidad.create({
      data: {
        name: o.name,
        address: o.name.replace(/^C\. P\. /, ""),
        city: o.city,
        unitsCount: o.units,
        inviteCode: `DEMO${String(i).padStart(4, "0")}`,
        plan: o.plan,
        subscriptionStatus: o.status,
        trialEndsAt: new Date(createdAt.getTime() + 14 * DAY),
        createdAt,
        units: { createMany: { data: Array.from({ length: o.units }, (_, n) => ({ label: String(n + 1), coefficient: new Prisma.Decimal((100 / o.units).toFixed(4)) })) } },
      },
    });
    await db.comunidadMember.create({ data: { comunidadId: c.id, userId: user.id, role: "PRESIDENT", displayName: user.name!, email: user.email } });

    const events: Prisma.BillingEventCreateManyInput[] = [{ comunidadId: c.id, type: "TRIAL_STARTED", plan: "COMUNIDAD", occurredAt: createdAt }];
    if (o.subscribedDaysAgo) {
      const initialPlan: PlanId = o.upgradedDaysAgo ? "COMUNIDAD" : o.status === "CANCELED" ? "COMUNIDAD" : o.plan;
      events.push({ comunidadId: c.id, type: "SUBSCRIBED", plan: initialPlan, mrrCents: PLANS[initialPlan].priceCents, occurredAt: daysAgo(o.subscribedDaysAgo) });
      const end = o.canceledDaysAgo ?? 0;
      for (let d = o.subscribedDaysAgo; d > end; d -= 30) {
        const plan: PlanId = o.upgradedDaysAgo && d <= o.upgradedDaysAgo ? o.plan : initialPlan;
        events.push({ comunidadId: c.id, type: "PAYMENT_SUCCEEDED", plan, mrrCents: PLANS[plan].priceCents, amountCents: Math.round(PLANS[plan].priceCents * 1.21), occurredAt: daysAgo(d) });
      }
      if (o.upgradedDaysAgo) events.push({ comunidadId: c.id, type: "PLAN_CHANGED", plan: o.plan, mrrCents: PLANS[o.plan].priceCents, occurredAt: daysAgo(o.upgradedDaysAgo) });
      if (o.canceledDaysAgo) events.push({ comunidadId: c.id, type: "CANCELED", plan: initialPlan, mrrCents: 0, occurredAt: daysAgo(o.canceledDaysAgo) });
      if (o.status === "PAST_DUE") events.push({ comunidadId: c.id, type: "PAYMENT_FAILED", plan: o.plan, mrrCents: PLANS[o.plan].priceCents, amountCents: Math.round(PLANS[o.plan].priceCents * 1.21), occurredAt: daysAgo(4) });
    }
    await db.billingEvent.createMany({ data: events });
  }
}

async function main() {
  await reset();
  const c = await seedGranVia();
  await seedOthers();
  console.log(`Seeded demo comunidad "${c.name}" (${c.id}). Invite code: ${c.inviteCode}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
