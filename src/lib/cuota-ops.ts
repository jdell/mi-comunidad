import "server-only";
import { db } from "@/lib/db";
import { cuotaKey, dueDateFor, monthlyCuotas, periodLabel } from "@/lib/cuotas";
import { escapeHtml } from "@/lib/email";
import { formatCents, formatDate } from "@/lib/format";
import { notifyMembers } from "@/lib/notifications";
import { appUrl } from "@/lib/urls";

/** Create the ordinary cuotas of a month for every unit (idempotent). Returns how many were created. */
export async function generateMonthlyCuotas(comunidadId: string, period: string) {
  const comunidad = await db.comunidad.findUnique({ where: { id: comunidadId } });
  if (!comunidad) return 0;
  const units = await db.unit.findMany({ where: { comunidadId }, orderBy: { createdAt: "asc" } });
  const shares = monthlyCuotas(comunidad, units.map((u) => ({ id: u.id, coefficient: u.coefficient.toNumber() })));
  const dueDate = dueDateFor(period, comunidad.cuotaDueDay);
  const data = shares
    .filter((s) => s.shareCents > 0)
    .map((s) => ({
      key: cuotaKey({ unitId: s.id, kind: "ORDINARIA", period }),
      comunidadId,
      unitId: s.id,
      kind: "ORDINARIA" as const,
      period,
      amountCents: s.shareCents,
      dueDate,
    }));
  if (data.length === 0) return 0;
  const res = await db.cuota.createMany({ data, skipDuplicates: true });
  return res.count;
}

/**
 * Email the members of every unit with overdue cuotas (LPH art. 21 requires prior
 * notice before claiming debts). Skips units reminded within `cooldownDays`.
 */
export async function sendCuotaReminders(comunidadId: string, opts: { cooldownDays?: number } = {}) {
  const now = new Date();
  const cooldown = new Date(now.getTime() - (opts.cooldownDays ?? 1) * 86_400_000);
  const comunidad = await db.comunidad.findUnique({ where: { id: comunidadId } });
  if (!comunidad) return { units: 0, members: 0 };

  const overdue = await db.cuota.findMany({
    where: { comunidadId, status: "PENDING", dueDate: { lt: now } },
    include: { unit: { select: { label: true } } },
    orderBy: { dueDate: "asc" },
  });
  const byUnit = new Map<string, typeof overdue>();
  for (const c of overdue) byUnit.set(c.unitId, [...(byUnit.get(c.unitId) ?? []), c]);

  let units = 0;
  let members = 0;
  for (const [unitId, cuotas] of byUnit) {
    const lastReminder = cuotas.reduce<Date | null>((acc, c) => (c.lastReminderAt && (!acc || c.lastReminderAt > acc) ? c.lastReminderAt : acc), null);
    if (lastReminder && lastReminder > cooldown) continue;
    const unitMembers = await db.comunidadMember.findMany({ where: { comunidadId, unitId, status: "ACTIVE" }, select: { id: true } });
    if (unitMembers.length === 0) continue;

    const total = cuotas.reduce((a, c) => a + c.amountCents, 0);
    const rows = cuotas
      .map((c) => `<li>${escapeHtml(c.kind === "DERRAMA" ? `Derrama (plazo ${c.installment})` : periodLabel(c.period))}: ${formatCents(c.amountCents)} — vencida el ${formatDate(c.dueDate)}</li>`)
      .join("");
    const sent = await notifyMembers({
      comunidadId,
      event: "cuota_reminder",
      memberIds: unitMembers.map((m) => m.id),
      subject: `Recordatorio de pago: ${formatCents(total)} pendientes — ${comunidad.name}`,
      title: "Tienes cuotas pendientes",
      html: `<p>Según nuestros registros, la vivienda <strong>${escapeHtml(cuotas[0]!.unit.label)}</strong> tiene pendientes de pago:</p><ul>${rows}</ul><p><strong>Total: ${formatCents(total)}</strong></p><p>Si ya has pagado, por favor avisa al tesorero o presidente para que lo actualicen. Recuerda que los propietarios que no estén al corriente de pago no pueden votar en las juntas (art. 15.2 LPH).</p>`,
      text: `${comunidad.name}: la vivienda ${cuotas[0]!.unit.label} tiene ${formatCents(total)} pendientes de pago.`,
      cta: { label: "Ver mis cuotas", href: appUrl(`/c/${comunidadId}/cuotas`) },
    });
    await db.cuota.updateMany({
      where: { id: { in: cuotas.map((c) => c.id) } },
      data: { lastReminderAt: now, remindersCount: { increment: 1 } },
    });
    units++;
    members += sent;
  }
  return { units, members };
}
