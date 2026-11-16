"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { IDEAS_PER_DAY, ideaSchema, VOTABLE_STATUSES } from "@/lib/ideas";
import { fieldErrors, type ActionState } from "@/lib/validation";

/** Submit a new idea. The author votes for it automatically. */
export async function createIdea(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/sugerencias");
  const parsed = ideaSchema.safeParse({ title: formData.get("title"), description: formData.get("description") });
  if (!parsed.success) return fieldErrors(parsed.error);

  const recent = await db.featureIdea.count({
    where: { authorId: user.id, createdAt: { gte: new Date(Date.now() - 86_400_000) } },
  });
  if (recent >= IDEAS_PER_DAY) return { error: `Puedes enviar hasta ${IDEAS_PER_DAY} sugerencias al día. ¡Gracias por tu interés!` };

  // Context for admins only: keep the comunidad only if the user really belongs to it.
  const fromComunidad = String(formData.get("comunidadId") ?? "");
  const membership = fromComunidad
    ? await db.comunidadMember.findUnique({
        where: { comunidadId_userId: { comunidadId: fromComunidad, userId: user.id } },
        select: { status: true },
      })
    : null;

  await db.featureIdea.create({
    data: {
      ...parsed.data,
      authorId: user.id,
      comunidadId: membership?.status === "ACTIVE" ? fromComunidad : null,
      votes: { create: { userId: user.id } },
    },
  });
  revalidatePath("/sugerencias");
  revalidatePath("/admin/sugerencias");
  return { ok: true, message: "¡Gracias! Hemos recibido tu sugerencia." };
}

/** Toggle the current user's vote on an idea. */
export async function toggleVote(formData: FormData) {
  const user = await requireUser("/sugerencias");
  const ideaId = z.string().min(1).safeParse(formData.get("ideaId"));
  if (!ideaId.success) return;

  const idea = await db.featureIdea.findUnique({ where: { id: ideaId.data }, select: { status: true, mergedIntoId: true } });
  if (!idea || idea.mergedIntoId || !VOTABLE_STATUSES.includes(idea.status)) return;

  const key = { ideaId_userId: { ideaId: ideaId.data, userId: user.id } };
  const existing = await db.ideaVote.findUnique({ where: key });
  if (existing) await db.ideaVote.delete({ where: key }).catch(() => {});
  else await db.ideaVote.create({ data: { ideaId: ideaId.data, userId: user.id } }).catch(() => {}); // double click: unique
  revalidatePath("/sugerencias");
}
