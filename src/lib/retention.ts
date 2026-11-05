import "server-only";
import { db } from "@/lib/db";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { computeEntitlements } from "@/lib/entitlements";
import { formatDate } from "@/lib/format";
import { appUrl } from "@/lib/urls";

const DAY = 86_400_000;

async function presidentsOf(comunidadId: string, opts: { productOnly: boolean }) {
  const presidents = await db.comunidadMember.findMany({
    where: { comunidadId, role: "PRESIDENT", status: "ACTIVE" },
    include: { user: { select: { email: true, productEmails: true, deletedAt: true } } },
  });
  return presidents
    .filter((p) => !p.user.deletedAt && (!opts.productOnly || p.user.productEmails))
    .map((p) => ({ memberId: p.id, name: p.displayName.split(" ")[0] ?? p.displayName, email: p.email ?? p.user.email }))
    .filter((p): p is { memberId: string; name: string; email: string } => Boolean(p.email));
}

async function sendToPresidents(
  comunidadId: string,
  event: string,
  productOnly: boolean,
  build: (name: string) => { subject: string; title: string; body: string; cta: { label: string; href: string } },
) {
  const recipients = await presidentsOf(comunidadId, { productOnly });
  let sent = 0;
  for (const r of recipients) {
    const m = build(r.name);
    const ok = await sendEmail({
      to: r.email,
      subject: m.subject,
      html: emailLayout({
        title: m.title,
        body: m.body,
        cta: m.cta,
        footer: productOnly
          ? `Puedes dejar de recibir estos consejos desde <a href="${appUrl("/cuenta")}" style="color:#8a7766">tu cuenta</a>.`
          : undefined,
      }),
    });
    await db.notificationLog.create({ data: { comunidadId, memberId: r.memberId, channel: "EMAIL", event, success: ok } });
    if (ok) sent++;
  }
  return sent;
}

/** Trial ends within 3 days and the comunidad has not subscribed. */
export async function sendTrialEndingReminders(now = new Date()) {
  const candidates = await db.comunidad.findMany({
    where: { trialReminderSentAt: null, plan: "GRATIS", trialEndsAt: { gt: now, lte: new Date(now.getTime() + 3 * DAY) } },
  });
  let count = 0;
  for (const c of candidates) {
    const e = computeEntitlements(c, { now });
    if (!e.trialActive) continue;
    const readOnly = c.unitsCount > 10;
    await sendToPresidents(c.id, "retention_trial_ending", false, (name) => ({
      subject: `Tu prueba de Mi Comunidad termina el ${formatDate(e.trialEndsAt)}`,
      title: `${name}, tu prueba termina pronto`,
      body: `<p>El periodo de prueba del plan Comunidad de <strong>${escapeHtml(c.name)}</strong> termina el ${formatDate(e.trialEndsAt)}.</p>
<p>${readOnly ? `Como tu comunidad tiene ${c.unitsCount} viviendas, después quedará en <strong>modo solo lectura</strong> hasta que elijas un plan.` : "Después seguirás en el plan Gratis, sin cuotas, votaciones ni actas automáticas."}</p>
<p>El plan Comunidad cuesta 9 € al mes: menos de 0,50 € por vivienda.</p>`,
      cta: { label: "Elegir plan", href: appUrl(`/c/${c.id}/plan`) },
    }));
    await db.comunidad.update({ where: { id: c.id }, data: { trialReminderSentAt: now } });
    count++;
  }
  return count;
}

/** 3+ days after sign-up and nobody else has joined yet. */
export async function sendActivationNudges(now = new Date()) {
  const candidates = await db.comunidad.findMany({
    where: { activationNudgeSentAt: null, createdAt: { lte: new Date(now.getTime() - 3 * DAY), gte: new Date(now.getTime() - 14 * DAY) } },
    include: { _count: { select: { members: { where: { status: "ACTIVE" } } } } },
  });
  let count = 0;
  for (const c of candidates.filter((x) => x._count.members <= 1)) {
    await sendToPresidents(c.id, "retention_activation", true, (name) => ({
      subject: `${name}, ¿invitamos a tus vecinos?`,
      title: "Tu comunidad está lista, faltan tus vecinos",
      body: `<p>Ya tienes <strong>${escapeHtml(c.name)}</strong> creada en Mi Comunidad. El siguiente paso es invitar a los vecinos:</p>
<ul><li>Comparte el enlace en el grupo de WhatsApp del edificio.</li><li>Imprime el póster con el código QR y ponlo junto a los buzones.</li><li>O envía invitaciones personales por vivienda.</li></ul>`,
      cta: { label: "Invitar vecinos", href: appUrl(`/c/${c.id}/invitar`) },
    }));
    await db.comunidad.update({ where: { id: c.id }, data: { activationNudgeSentAt: now } });
    count++;
  }
  return count;
}

/** Win-back for comunidades with no activity in 30 days (at most every 60 days). */
export async function sendWinbackEmails(now = new Date()) {
  const since = new Date(now.getTime() - 30 * DAY);
  const candidates = await db.comunidad.findMany({
    where: {
      createdAt: { lte: since },
      OR: [{ winbackSentAt: null }, { winbackSentAt: { lte: new Date(now.getTime() - 60 * DAY) } }],
      announcements: { none: { createdAt: { gte: since } } },
      incidencias: { none: { OR: [{ createdAt: { gte: since } }, { updatedAt: { gte: since } }] } },
      juntas: { none: { updatedAt: { gte: since } } },
      documents: { none: { createdAt: { gte: since } } },
      cuotas: { none: { updatedAt: { gte: since } } },
    },
    take: 200,
  });
  for (const c of candidates) {
    await sendToPresidents(c.id, "retention_winback", true, (name) => ({
      subject: `${name}, ¿cómo va todo en ${c.name}?`,
      title: "Te echamos de menos",
      body: `<p>Hace un mes que no hay movimiento en <strong>${escapeHtml(c.name)}</strong>. Algunas ideas para sacarle partido:</p>
<ul><li>Publica un anuncio con las próximas revisiones (ascensor, extintores, ITE).</li><li>Sube el acta de la última junta y la póliza del seguro a Documentos.</li><li>Configura las cuotas y deja que los recordatorios trabajen por ti.</li></ul>
<p>¿Algo no te convence? Responde a este email y nos lo cuentas.</p>`,
      cta: { label: "Abrir mi comunidad", href: appUrl(`/c/${c.id}`) },
    }));
    await db.comunidad.update({ where: { id: c.id }, data: { winbackSentAt: now } });
  }
  return candidates.length;
}
