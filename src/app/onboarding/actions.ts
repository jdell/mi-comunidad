"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { generateCode, normalizeCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { generateUnits } from "@/lib/units";
import { cifSchema, fieldErrors, type ActionState } from "@/lib/validation";

const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().int().min(1).max(60).optional(),
);

const schema = z
  .object({
    name: z.string().trim().min(3, "Indica el nombre de la comunidad").max(120),
    address: z.string().trim().min(5, "Indica la dirección").max(200),
    city: z.string().trim().max(80).optional(),
    postalCode: z
      .string()
      .trim()
      .regex(/^(\d{5})?$/, "Código postal de 5 dígitos")
      .optional(),
    cif: z.union([z.literal(""), cifSchema]).optional(),
    unitsCount: z.coerce.number().int().min(1, "Mínimo 1 vivienda").max(2000, "Máximo 2000 viviendas"),
    floors: optionalInt,
    doorsPerFloor: optionalInt,
    presidentName: z.string().trim().min(2, "Indica tu nombre").max(80),
  })
  .refine((d) => !d.floors || !d.doorsPerFloor || d.floors * d.doorsPerFloor === d.unitsCount, {
    path: ["unitsCount"],
    message: "Plantas × puertas debe coincidir con el número de viviendas",
  });

export async function createComunidad(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/onboarding");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const data = parsed.data;

  const units = generateUnits({ count: data.unitsCount, floors: data.floors, doorsPerFloor: data.doorsPerFloor });

  const comunidad = await db.$transaction(async (tx) => {
    const created = await tx.comunidad.create({
      data: {
        name: data.name,
        address: data.address,
        city: data.city || null,
        postalCode: data.postalCode || null,
        cif: data.cif || null,
        unitsCount: units.length,
        inviteCode: generateCode(8),
        units: { createMany: { data: units } },
      },
    });
    await tx.comunidadMember.create({
      data: {
        comunidadId: created.id,
        userId: user.id,
        role: "PRESIDENT",
        status: "ACTIVE",
        displayName: data.presidentName,
        email: user.email,
        phone: user.phone,
      },
    });
    if (!user.name) await tx.user.update({ where: { id: user.id }, data: { name: data.presidentName } });
    return created;
  });

  redirect(`/c/${comunidad.id}/unidades?bienvenida=1`);
}

export async function goToInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (code.length < 6) return { error: "El código tiene al menos 6 caracteres." };
  redirect(`/unirse/${code}`);
}
