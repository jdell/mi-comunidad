"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { generateMonthlyCuotas, sendCuotaReminders } from "@/lib/cuota-ops";
import { addMonths, cuotaKey, dueDateFor, isValidPeriod, splitByCoefficient, splitInstallments } from "@/lib/cuotas";
import { db } from "@/lib/db";
import { parseEurosToCents } from "@/lib/format";
import { FINANCE_ROLES } from "@/lib/roles";
import { fieldErrors, type ActionState } from "@/lib/validation";

const euros = z
  .string()
  .transform((v, ctx) => {
    const cents = parseEurosToCents(v || "0");
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Importe no válido" });
      return z.NEVER;
    }
    return cents;
  });

const configSchema = z.object({
  comunidadId: z.string().min(1),
  cuotaMode: z.enum(["FIXED", "COEFFICIENT"]),
  cuotaFixed: euros,
  cuotaAnnualBudget: euros,
  cuotaDueDay: z.coerce.number().int().min(1).max(28),
});

export async function saveCuotaConfig(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = configSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, cuotaMode, cuotaFixed, cuotaAnnualBudget, cuotaDueDay } = parsed.data;
  await requireMember(comunidadId, FINANCE_ROLES, { feature: "cuotas" });
  await db.comunidad.update({
    where: { id: comunidadId },
    data: { cuotaMode, cuotaFixedCents: cuotaFixed, cuotaAnnualBudgetCents: cuotaAnnualBudget, cuotaDueDay },
  });
  revalidatePath(`/c/${comunidadId}/cuotas`, "layout");
  return { ok: true, message: "Configuración de cuotas guardada" };
}

export async function generateCuotas(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const period = String(formData.get("period"));
  await requireMember(comunidadId, FINANCE_ROLES, { feature: "cuotas" });
  if (!isValidPeriod(period)) return;
  await generateMonthlyCuotas(comunidadId, period);
  revalidatePath(`/c/${comunidadId}/cuotas`);
}

export async function togglePaid(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const cuotaId = String(formData.get("cuotaId"));
  await requireMember(comunidadId, FINANCE_ROLES, { feature: "cuotas" });
  const cuota = await db.cuota.findFirst({ where: { id: cuotaId, comunidadId } });
  if (!cuota) return;
  const paid = cuota.status === "PAID";
  await db.cuota.update({
    where: { id: cuota.id },
    data: paid ? { status: "PENDING", paidAt: null } : { status: "PAID", paidAt: new Date() },
  });
  revalidatePath(`/c/${comunidadId}/cuotas`);
  revalidatePath(`/c/${comunidadId}`);
}

export async function sendReminders(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const comunidadId = String(formData.get("comunidadId"));
  await requireMember(comunidadId, FINANCE_ROLES, { feature: "reminders" });
  const { units, members } = await sendCuotaReminders(comunidadId, { cooldownDays: 1 });
  revalidatePath(`/c/${comunidadId}/cuotas`);
  if (units === 0) return { ok: true, message: "No hay recordatorios que enviar (o ya se enviaron en las últimas 24 h)." };
  return { ok: true, message: `Recordatorio enviado a ${units} viviendas (${members} emails).` };
}

const derramaSchema = z.object({
  comunidadId: z.string().min(1),
  title: z.string().trim().min(3, "Pon un concepto").max(140),
  description: z.string().trim().max(2000).optional(),
  total: euros.refine((c) => c > 0, "Indica el importe total"),
  installments: z.coerce.number().int().min(1).max(36),
  firstPeriod: z.string().refine(isValidPeriod, "Mes no válido"),
});

export async function createDerrama(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = derramaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, title, description, total, installments, firstPeriod } = parsed.data;
  const { comunidad } = await requireMember(comunidadId, FINANCE_ROLES, { feature: "derramas" });

  const units = await db.unit.findMany({ where: { comunidadId }, orderBy: { createdAt: "asc" } });
  if (units.length === 0) return { error: "La comunidad no tiene viviendas." };
  const shares = splitByCoefficient(total, units.map((u) => ({ id: u.id, coefficient: u.coefficient.toNumber() })));

  await db.$transaction(async (tx) => {
    const derrama = await tx.derrama.create({
      data: {
        comunidadId,
        title,
        description: description || null,
        totalCents: total,
        installments,
        firstDueDate: dueDateFor(firstPeriod, comunidad.cuotaDueDay),
      },
    });
    const rows = shares.flatMap((s) =>
      splitInstallments(s.shareCents, installments).map((amountCents, i) => {
        const period = addMonths(firstPeriod, i);
        return {
          key: cuotaKey({ unitId: s.id, kind: "DERRAMA", period, derramaId: derrama.id, installment: i + 1 }),
          comunidadId,
          unitId: s.id,
          kind: "DERRAMA" as const,
          period,
          derramaId: derrama.id,
          installment: i + 1,
          amountCents,
          dueDate: dueDateFor(period, comunidad.cuotaDueDay),
        };
      }),
    );
    await tx.cuota.createMany({ data: rows.filter((r) => r.amountCents > 0) });
  });

  revalidatePath(`/c/${comunidadId}/cuotas`, "layout");
  redirect(`/c/${comunidadId}/cuotas/derramas`);
}

export async function deleteDerrama(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const derramaId = String(formData.get("derramaId"));
  await requireMember(comunidadId, FINANCE_ROLES, { feature: "derramas" });
  const paid = await db.cuota.count({ where: { derramaId, comunidadId, status: "PAID" } });
  if (paid > 0) return;
  await db.derrama.deleteMany({ where: { id: derramaId, comunidadId } });
  revalidatePath(`/c/${comunidadId}/cuotas`, "layout");
}
