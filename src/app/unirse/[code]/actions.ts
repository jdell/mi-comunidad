"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveInviteCode } from "@/lib/invitations";
import { fieldErrors, type ActionState } from "@/lib/validation";

const schema = z.object({
  code: z.string().min(1),
  displayName: z.string().trim().min(2, "Indica tu nombre").max(80),
  unitId: z.string().optional(),
});

export async function joinComunidad(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { code, displayName } = parsed.data;

  const user = await requireUser(`/unirse/${code}`);
  const resolved = await resolveInviteCode(code);
  if (!resolved || resolved.invalid) return { error: "Esta invitación ya no es válida." };
  const { comunidad, invitation } = resolved;

  const existing = await db.comunidadMember.findUnique({
    where: { comunidadId_userId: { comunidadId: comunidad.id, userId: user.id } },
  });
  if (existing && existing.status !== "REMOVED") redirect(`/c/${comunidad.id}`);

  // A personal invitation fixes the unit; otherwise the vecino picks one.
  const unitId = invitation?.unitId ?? (parsed.data.unitId || null);
  if (unitId) {
    const unit = await db.unit.findFirst({
      where: { id: unitId, comunidadId: comunidad.id },
      include: { members: { where: { status: { in: ["ACTIVE", "PENDING"] } } } },
    });
    if (!unit) return { error: "La vivienda seleccionada no existe." };
    if (!invitation && unit.members.length > 0) {
      return { error: "Esa vivienda ya está registrada. Pide una invitación personal al presidente." };
    }
  }

  // Personal invitations are trusted; link joins respect the approval mode.
  const status = invitation || comunidad.approvalMode === "AUTOMATIC" ? "ACTIVE" : "PENDING";

  await db.$transaction(async (tx) => {
    await tx.comunidadMember.upsert({
      where: { comunidadId_userId: { comunidadId: comunidad.id, userId: user.id } },
      create: {
        comunidadId: comunidad.id,
        userId: user.id,
        unitId,
        role: invitation?.role ?? "VECINO",
        status,
        displayName,
        email: user.email,
        phone: user.phone,
      },
      update: { unitId, role: invitation?.role ?? "VECINO", status, displayName, joinedAt: new Date() },
    });
    if (invitation) {
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date(), acceptedById: user.id },
      });
    }
    if (!user.name) await tx.user.update({ where: { id: user.id }, data: { name: displayName } });
  });

  redirect(status === "ACTIVE" ? `/c/${comunidad.id}` : "/c");
}
