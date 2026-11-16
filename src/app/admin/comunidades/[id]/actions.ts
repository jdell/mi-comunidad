"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { sendCourtesyGrantEmail } from "@/lib/courtesy";
import { COURTESY_DURATION_KEYS, courtesyUntil } from "@/lib/courtesy-grant";
import { db } from "@/lib/db";
import { COURTESY_PLAN, courtesyActive, PAID_STATUSES } from "@/lib/entitlements";
import { formatDate } from "@/lib/format";
import type { ActionState } from "@/lib/validation";

const grantSchema = z.object({
  comunidadId: z.string().min(1),
  duration: z.enum(COURTESY_DURATION_KEYS),
});

/** Grant (or extend) courtesy Pro for a limited time and email the presidents. */
export async function grantCourtesy(_prev: ActionState | undefined, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = grantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Duración no válida." };
  const { comunidadId, duration } = parsed.data;

  const c = await db.comunidad.findUnique({
    where: { id: comunidadId },
    select: { id: true, name: true, unitsCount: true, plan: true, subscriptionStatus: true, proGrantedUntil: true },
  });
  if (!c) return { error: "Comunidad no encontrada." };
  if (c.plan !== "GRATIS" && (PAID_STATUSES as readonly string[]).includes(c.subscriptionStatus)) {
    return { error: "Esta comunidad ya tiene una suscripción de pago." };
  }

  const now = new Date();
  const extended = courtesyActive(c, now);
  const until = courtesyUntil(duration, c.proGrantedUntil, now);

  await db.$transaction([
    db.comunidad.update({ where: { id: c.id }, data: { proGrantedUntil: until } }),
    db.billingEvent.create({ data: { comunidadId: c.id, type: "COURTESY_GRANTED", plan: COURTESY_PLAN, mrrCents: 0 } }),
  ]);
  const sent = await sendCourtesyGrantEmail(c, until, { extended });

  revalidatePath(`/admin/comunidades/${c.id}`);
  revalidatePath("/admin/comunidades");
  return {
    ok: true,
    message: `${extended ? "Ampliado" : "Concedido"} hasta el ${formatDate(until)}. ${sent ? `Email enviado a ${sent} presidente${sent === 1 ? "" : "s"}.` : "No se ha podido enviar el email (sin presidente con email)."}`,
  };
}

/** End a courtesy grant immediately (no email). */
export async function revokeCourtesy(_prev: ActionState | undefined, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const comunidadId = z.string().min(1).safeParse(formData.get("comunidadId"));
  if (!comunidadId.success) return { error: "Comunidad no válida." };

  const c = await db.comunidad.findUnique({ where: { id: comunidadId.data }, select: { id: true, proGrantedUntil: true } });
  if (!c) return { error: "Comunidad no encontrada." };
  if (!courtesyActive(c)) return { error: "No hay ninguna cortesía activa." };

  await db.$transaction([
    db.comunidad.update({ where: { id: c.id }, data: { proGrantedUntil: null } }),
    db.billingEvent.create({ data: { comunidadId: c.id, type: "COURTESY_REVOKED", plan: COURTESY_PLAN, mrrCents: 0 } }),
  ]);
  revalidatePath(`/admin/comunidades/${c.id}`);
  revalidatePath("/admin/comunidades");
  return { ok: true, message: "Cortesía revocada." };
}
