"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { generateCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { emailLayout, escapeHtml, sendEmail } from "@/lib/email";
import { MANAGER_ROLES } from "@/lib/roles";
import { appUrl } from "@/lib/urls";
import { fieldErrors, toE164, type ActionState } from "@/lib/validation";

const inviteSchema = z.object({
  comunidadId: z.string().min(1),
  unitId: z.string().optional(),
  name: z.string().trim().max(80).optional(),
  email: z.union([z.literal(""), z.email("Email no válido")]).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[\d\s-]{9,16})?$/, "Teléfono no válido")
    .optional(),
});

export async function createInvitation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, unitId, name, email, phone } = parsed.data;
  const { user, member, comunidad } = await requireMember(comunidadId, MANAGER_ROLES);

  if (unitId) {
    const unit = await db.unit.findFirst({ where: { id: unitId, comunidadId } });
    if (!unit) return { error: "Vivienda no encontrada." };
  }

  // Revoke previous pending invitations for the same unit.
  if (unitId) {
    await db.invitation.updateMany({
      where: { comunidadId, unitId, status: "PENDING" },
      data: { status: "REVOKED" },
    });
  }

  const invitation = await db.invitation.create({
    data: {
      comunidadId,
      unitId: unitId || null,
      code: generateCode(10),
      name: name || null,
      email: email || null,
      phone: phone ? toE164(phone) : null,
      createdById: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
    include: { unit: true },
  });

  const link = appUrl(`/unirse/${invitation.code}`);
  let message = "Invitación creada. Compártela por WhatsApp o cópiala.";
  if (invitation.email) {
    const sent = await sendEmail({
      to: invitation.email,
      subject: `${member.displayName} te invita a ${comunidad.name}`,
      html: emailLayout({
        title: `Te han invitado a ${comunidad.name}`,
        body: `<p>Hola${invitation.name ? ` ${escapeHtml(invitation.name)}` : ""},</p><p>${escapeHtml(member.displayName)} te invita a unirte a la comunidad <strong>${escapeHtml(comunidad.name)}</strong>${invitation.unit ? ` (vivienda ${escapeHtml(invitation.unit.label)})` : ""} en Mi Comunidad, donde se publican los anuncios, incidencias, documentos y juntas.</p>`,
        cta: { label: "Unirme a la comunidad", href: link },
      }),
    });
    if (sent) {
      await db.invitation.update({ where: { id: invitation.id }, data: { sentAt: new Date() } });
      message = `Invitación enviada a ${invitation.email}.`;
    }
  }

  revalidatePath(`/c/${comunidadId}/invitar`);
  return {
    ok: true,
    message,
    data: {
      link,
      text: `Hola${invitation.name ? ` ${invitation.name}` : ""}, únete a ${comunidad.name} en Mi Comunidad: ${link}`,
    },
  };
}

export async function revokeInvitation(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const invitationId = String(formData.get("invitationId"));
  await requireMember(comunidadId, MANAGER_ROLES);
  await db.invitation.updateMany({
    where: { id: invitationId, comunidadId, status: "PENDING" },
    data: { status: "REVOKED" },
  });
  revalidatePath(`/c/${comunidadId}/invitar`);
}

export async function regenerateInviteLink(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  await requireMember(comunidadId, MANAGER_ROLES);
  await db.comunidad.update({ where: { id: comunidadId }, data: { inviteCode: generateCode(8) } });
  revalidatePath(`/c/${comunidadId}/invitar`);
}

export async function setApprovalMode(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const mode = formData.get("approvalMode") === "MANUAL" ? "MANUAL" : "AUTOMATIC";
  await requireMember(comunidadId, MANAGER_ROLES);
  await db.comunidad.update({ where: { id: comunidadId }, data: { approvalMode: mode } });
  revalidatePath(`/c/${comunidadId}/invitar`);
}

export async function reviewRequest(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const memberId = String(formData.get("memberId"));
  const decision = formData.get("decision") === "approve" ? "ACTIVE" : "REMOVED";
  await requireMember(comunidadId, MANAGER_ROLES);
  await db.comunidadMember.updateMany({
    where: { id: memberId, comunidadId, status: "PENDING" },
    data: decision === "REMOVED" ? { status: decision, unitId: null } : { status: decision },
  });
  revalidatePath(`/c/${comunidadId}/invitar`);
  revalidatePath(`/c/${comunidadId}`);
}
