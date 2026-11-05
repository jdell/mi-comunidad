"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { cifSchema, fieldErrors, toE164, type ActionState } from "@/lib/validation";

const profileSchema = z.object({
  comunidadId: z.string().min(1),
  displayName: z.string().trim().min(2, "Indica tu nombre").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[\d\s-]{9,16})?$/, "Teléfono no válido")
    .optional(),
  email: z.union([z.literal(""), z.email("Email no válido")]).optional(),
  unitId: z.string().optional(),
  notifyEmail: z.preprocess((v) => v === "on", z.boolean()),
  notifyWhatsApp: z.preprocess((v) => v === "on", z.boolean()),
});

export async function updateMyProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, displayName, phone, email, unitId, notifyEmail, notifyWhatsApp } = parsed.data;
  const { member } = await requireMember(comunidadId);

  if (unitId && unitId !== member.unitId) {
    const taken = await db.comunidadMember.count({
      where: { comunidadId, unitId, status: { in: ["ACTIVE", "PENDING"] }, NOT: { id: member.id } },
    });
    const exists = await db.unit.count({ where: { id: unitId, comunidadId } });
    if (!exists) return { error: "Vivienda no encontrada" };
    if (taken) return { error: "Esa vivienda ya tiene un vecino registrado. Pide al presidente que te asigne." };
  }

  await db.comunidadMember.update({
    where: { id: member.id },
    data: { displayName, phone: phone ? toE164(phone) : null, email: email || null, unitId: unitId || null, notifyEmail, notifyWhatsApp: notifyWhatsApp && Boolean(phone) },
  });
  revalidatePath(`/c/${comunidadId}`, "layout");
  return { ok: true, message: "Perfil actualizado" };
}

const comunidadSchema = z.object({
  comunidadId: z.string().min(1),
  name: z.string().trim().min(3).max(120),
  address: z.string().trim().min(5).max(200),
  city: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().regex(/^(\d{5})?$/, "Código postal de 5 dígitos").optional(),
  cif: z.union([z.literal(""), cifSchema]).optional(),
});

export async function updateComunidad(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = comunidadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, ...data } = parsed.data;
  await requireMember(comunidadId, ["PRESIDENT"]);
  await db.comunidad.update({
    where: { id: comunidadId },
    data: { ...data, city: data.city || null, postalCode: data.postalCode || null, cif: data.cif || null },
  });
  revalidatePath(`/c/${comunidadId}`, "layout");
  return { ok: true, message: "Datos de la comunidad guardados" };
}

export async function leaveComunidad(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const { member } = await requireMember(comunidadId);
  // LPH continuity: a president must hand over the role before leaving.
  if (member.role === "PRESIDENT") redirect(`/c/${comunidadId}/ajustes?error=presidente`);
  await db.comunidadMember.update({ where: { id: member.id }, data: { status: "REMOVED", unitId: null } });
  redirect("/c");
}
