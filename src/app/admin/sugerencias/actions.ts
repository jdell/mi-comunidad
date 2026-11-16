"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { IDEA_STATUSES } from "@/lib/ideas";
import type { ActionState } from "@/lib/validation";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => v || null);

const updateSchema = z.object({
  ideaId: z.string().min(1),
  status: z.enum(IDEA_STATUSES),
  response: optionalText(1000),
  adminNote: optionalText(4000),
});

function revalidate(ideaId: string) {
  revalidatePath("/admin/sugerencias");
  revalidatePath(`/admin/sugerencias/${ideaId}`);
  revalidatePath("/sugerencias");
}

/** Status, public response and internal notes. */
export async function updateIdea(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = updateSchema.safeParse({
    ideaId: formData.get("ideaId"),
    status: formData.get("status"),
    response: formData.get("response") ?? "",
    adminNote: formData.get("adminNote") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const { ideaId, ...data } = parsed.data;
  const updated = await db.featureIdea.updateMany({ where: { id: ideaId }, data });
  if (!updated.count) return { error: "Sugerencia no encontrada." };
  revalidate(ideaId);
  return { ok: true, message: "Sugerencia actualizada." };
}

const mergeSchema = z.object({ ideaId: z.string().min(1), targetId: z.string().min(1, "Elige la sugerencia de destino") });

/**
 * Merge a duplicate into another idea: votes move to the target (one per user),
 * ideas previously merged into the duplicate are repointed, and the duplicate is hidden from the board.
 */
export async function mergeIdea(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = mergeSchema.safeParse({ ideaId: formData.get("ideaId"), targetId: formData.get("targetId") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const { ideaId, targetId } = parsed.data;
  if (ideaId === targetId) return { error: "No puedes fusionar una sugerencia consigo misma." };

  const [source, target] = await Promise.all([
    db.featureIdea.findUnique({ where: { id: ideaId }, select: { id: true, mergedIntoId: true, response: true } }),
    db.featureIdea.findUnique({ where: { id: targetId }, select: { id: true, title: true, mergedIntoId: true } }),
  ]);
  if (!source || !target) return { error: "Sugerencia no encontrada." };
  if (source.mergedIntoId) return { error: "Esta sugerencia ya está fusionada." };
  if (target.mergedIntoId) return { error: "La sugerencia de destino está fusionada con otra; elige la principal." };

  const moved = await db.$transaction(async (tx) => {
    const votes = await tx.ideaVote.findMany({ where: { ideaId }, select: { userId: true, createdAt: true } });
    const { count } = await tx.ideaVote.createMany({
      data: votes.map((v) => ({ ideaId: targetId, userId: v.userId, createdAt: v.createdAt })),
      skipDuplicates: true,
    });
    await tx.ideaVote.deleteMany({ where: { ideaId } });
    await tx.featureIdea.updateMany({ where: { mergedIntoId: ideaId }, data: { mergedIntoId: targetId } });
    await tx.featureIdea.update({
      where: { id: ideaId },
      data: { mergedIntoId: targetId, status: "DISMISSED", response: source.response ?? `Unificada con «${target.title}».` },
    });
    return count;
  });

  revalidate(ideaId);
  revalidate(targetId);
  return { ok: true, message: `Fusionada. ${moved === 1 ? "1 voto nuevo" : `${moved} votos nuevos`} en «${target.title}».` };
}
