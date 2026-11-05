"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActionState } from "@/lib/validation";

export async function dismissOnboarding(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  await requireMember(comunidadId, ["PRESIDENT"]);
  await db.comunidad.update({ where: { id: comunidadId }, data: { onboardingDismissedAt: new Date() } });
  revalidatePath(`/c/${comunidadId}`);
}

const npsSchema = z.object({
  comunidadId: z.string().min(1),
  score: z.coerce.number().int().min(0).max(10),
  comment: z.string().trim().max(2000).optional(),
});

export async function submitNps(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = npsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Elige una puntuación del 0 al 10." };
  const { comunidadId, score, comment } = parsed.data;
  const { user } = await requireMember(comunidadId);
  await db.npsResponse.create({ data: { userId: user.id, comunidadId, score, comment: comment || null } });
  return { ok: true, message: "¡Gracias por tu opinión!" };
}

export async function dismissNps(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const { user } = await requireMember(comunidadId);
  await db.npsResponse.create({ data: { userId: user.id, comunidadId, score: null } });
  revalidatePath(`/c/${comunidadId}`);
}
