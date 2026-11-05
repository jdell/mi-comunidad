import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron";
import { generateMonthlyCuotas, sendCuotaReminders } from "@/lib/cuota-ops";
import { periodOf } from "@/lib/cuotas";
import { db } from "@/lib/db";
import { escapeHtml } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { notifyMembers } from "@/lib/notifications";
import { sendReferralFollowUps } from "@/lib/referrals";
import { sendActivationNudges, sendTrialEndingReminders, sendWinbackEmails } from "@/lib/retention";
import { appUrl } from "@/lib/urls";

export const maxDuration = 300;

/**
 * Daily housekeeping (Vercel Cron, see vercel.json):
 *  1. Generate this month's ordinary cuotas for configured comunidades.
 *  2. Weekly automatic reminders for overdue cuotas.
 *  3. Junta reminders 2 days before.
 *  4. Lifecycle emails: trial ending, activation nudge, inactive win-back.
 *  5. Day-21 referral follow-up to referring comunidades.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const period = periodOf(now);
  const summary = { cuotasCreated: 0, reminderUnits: 0, juntaReminders: 0, trialReminders: 0, activationNudges: 0, winbacks: 0, referralFollowUps: 0 };

  const comunidades = await db.comunidad.findMany({
    where: { OR: [{ cuotaFixedCents: { gt: 0 } }, { cuotaAnnualBudgetCents: { gt: 0 } }] },
    select: { id: true },
  });
  for (const c of comunidades) {
    summary.cuotasCreated += await generateMonthlyCuotas(c.id, period);
    summary.reminderUnits += (await sendCuotaReminders(c.id, { cooldownDays: 7 })).units;
  }

  const soon = new Date(now.getTime() + 2 * 86_400_000);
  const juntas = await db.junta.findMany({
    where: { status: "CONVOCADA", reminderSentAt: null, scheduledAt: { gt: now, lte: soon } },
    include: { comunidad: { select: { name: true } } },
  });
  for (const j of juntas) {
    await notifyMembers({
      comunidadId: j.comunidadId,
      event: "junta_reminder",
      subject: `Recordatorio: junta el ${formatDateTime(j.scheduledAt)} — ${j.comunidad.name}`,
      title: "Recordatorio de junta",
      html: `<p>La junta de <strong>${escapeHtml(j.comunidad.name)}</strong> se celebra el <strong>${escapeHtml(formatDateTime(j.scheduledAt))}</strong> en ${escapeHtml(j.location)}. Si no puedes asistir, delega tu voto desde la app.</p>`,
      text: `Recordatorio: junta de ${j.comunidad.name} el ${formatDateTime(j.scheduledAt)} en ${j.location}.`,
      cta: { label: "Ver la junta", href: appUrl(`/c/${j.comunidadId}/juntas/${j.id}`) },
    });
    await db.junta.update({ where: { id: j.id }, data: { reminderSentAt: now } });
    summary.juntaReminders++;
  }

  summary.trialReminders = await sendTrialEndingReminders(now);
  summary.activationNudges = await sendActivationNudges(now);
  summary.winbacks = await sendWinbackEmails(now);
  summary.referralFollowUps = await sendReferralFollowUps(now);

  return NextResponse.json({ ok: true, ...summary });
}
