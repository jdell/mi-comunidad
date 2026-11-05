"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { escapeHtml } from "@/lib/email";
import { notifyMembers } from "@/lib/notifications";
import { ROLE_LABELS } from "@/lib/roles";
import { appUrl } from "@/lib/urls";
import { type ActionState } from "@/lib/validation";

const roleSchema = z.object({
  comunidadId: z.string().min(1),
  memberId: z.string().min(1),
  role: z.enum(["SECRETARY", "TREASURER", "VECINO"]),
});

/** President assigns board roles (presidency is moved with transferPresidency). */
export async function changeRole(formData: FormData) {
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { comunidadId, memberId, role } = parsed.data;
  const { member } = await requireMember(comunidadId, ["PRESIDENT"]);
  if (memberId === member.id) return;
  await db.comunidadMember.updateMany({
    where: { id: memberId, comunidadId, status: "ACTIVE", role: { not: "PRESIDENT" } },
    data: { role },
  });
  revalidatePath(`/c/${comunidadId}/vecinos`);
}

export async function removeMember(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const memberId = String(formData.get("memberId"));
  const { member } = await requireMember(comunidadId, ["PRESIDENT"]);
  if (memberId === member.id) return;
  await db.comunidadMember.updateMany({
    where: { id: memberId, comunidadId, role: { not: "PRESIDENT" } },
    data: { status: "REMOVED", unitId: null, role: "VECINO" },
  });
  revalidatePath(`/c/${comunidadId}/vecinos`);
}

const transferSchema = z.object({
  comunidadId: z.string().min(1),
  memberId: z.string().min(1, "Elige al nuevo presidente"),
  reason: z.enum(["ROTACION", "DIMISION", "VENTA"]),
});

const REASONS = { ROTACION: "rotación anual (junta)", DIMISION: "dimisión voluntaria", VENTA: "cambio de propiedad" };

export async function transferPresidency(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = transferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const { comunidadId, memberId, reason } = parsed.data;
  const { member, comunidad } = await requireMember(comunidadId, ["PRESIDENT"]);
  if (memberId === member.id) return { error: "Elige a otro vecino." };

  const target = await db.comunidadMember.findFirst({ where: { id: memberId, comunidadId, status: "ACTIVE" } });
  if (!target) return { error: "Vecino no encontrado." };

  await db.$transaction([
    db.comunidadMember.update({ where: { id: target.id }, data: { role: "PRESIDENT" } }),
    db.comunidadMember.update({ where: { id: member.id }, data: { role: "VECINO" } }),
  ]);

  await notifyMembers({
    comunidadId,
    event: "membership",
    memberIds: [target.id, member.id],
    subject: `Cambio de presidencia en ${comunidad.name}`,
    title: "Cambio de presidencia",
    html: `<p>${escapeHtml(target.displayName)} es ahora ${ROLE_LABELS.PRESIDENT.toLowerCase()} de <strong>${escapeHtml(comunidad.name)}</strong> (motivo: ${REASONS[reason]}). ${escapeHtml(member.displayName)} pasa a ser vecino/a.</p>`,
    text: `${target.displayName} es el nuevo presidente de ${comunidad.name}.`,
    cta: { label: "Abrir Mi Comunidad", href: appUrl(`/c/${comunidadId}`) },
  });

  redirect(`/c/${comunidadId}/vecinos?transferido=1`);
}
