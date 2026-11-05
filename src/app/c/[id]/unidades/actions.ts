"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getEntitlements, requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { MANAGER_ROLES } from "@/lib/roles";
import { equalCoefficients } from "@/lib/units";
import { type ActionState } from "@/lib/validation";

const coefficient = z
  .string()
  .trim()
  .transform((v) => v.replace(",", "."))
  .pipe(z.string().regex(/^\d{1,3}(\.\d{1,4})?$/, "Coeficiente no válido (ej. 5,2500)"))
  .transform((v) => new Prisma.Decimal(v))
  .refine((d) => d.lte(100), "Máximo 100");

const unitSchema = z.object({
  comunidadId: z.string().min(1),
  unitId: z.string().optional(),
  label: z.string().trim().min(1, "Indica la vivienda").max(20),
  floor: z.string().trim().max(10).optional(),
  door: z.string().trim().max(10).optional(),
  coefficient,
});

export async function saveUnit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = unitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const { comunidadId, unitId, ...data } = parsed.data;
  const { comunidad } = await requireMember(comunidadId, MANAGER_ROLES);
  if (!unitId) {
    const { unitLimit } = await getEntitlements(comunidad);
    if (unitLimit !== null && comunidad.unitsCount + 1 > unitLimit) {
      return { error: `Tu plan permite hasta ${unitLimit} viviendas. Cambia de plan para añadir más.` };
    }
  }

  const values = { label: data.label, floor: data.floor || null, door: data.door || null, coefficient: data.coefficient };
  try {
    if (unitId) {
      const res = await db.unit.updateMany({ where: { id: unitId, comunidadId }, data: values });
      if (res.count === 0) return { error: "Vivienda no encontrada" };
    } else {
      await db.$transaction([
        db.unit.create({ data: { comunidadId, ...values } }),
        db.comunidad.update({ where: { id: comunidadId }, data: { unitsCount: { increment: 1 } } }),
      ]);
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: `Ya existe una vivienda "${data.label}"` };
    }
    throw err;
  }
  revalidatePath(`/c/${comunidadId}/unidades`);
  return { ok: true, message: unitId ? "Vivienda actualizada" : "Vivienda añadida" };
}

export async function deleteUnit(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const unitId = String(formData.get("unitId"));
  await requireMember(comunidadId, MANAGER_ROLES);
  const members = await db.comunidadMember.count({ where: { unitId, status: { in: ["ACTIVE", "PENDING"] } } });
  if (members > 0) return;
  await db.$transaction([
    db.unit.deleteMany({ where: { id: unitId, comunidadId } }),
    db.comunidad.update({ where: { id: comunidadId }, data: { unitsCount: { decrement: 1 } } }),
  ]);
  revalidatePath(`/c/${comunidadId}/unidades`);
}

export async function distributeEqually(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  await requireMember(comunidadId, MANAGER_ROLES);
  const units = await db.unit.findMany({ where: { comunidadId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  const coefs = equalCoefficients(units.length);
  await db.$transaction(units.map((u, i) => db.unit.update({ where: { id: u.id }, data: { coefficient: coefs[i]! } })));
  revalidatePath(`/c/${comunidadId}/unidades`);
}
