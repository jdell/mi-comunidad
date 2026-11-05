"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { escapeHtml, textToHtml } from "@/lib/email";
import { notifyMembers } from "@/lib/notifications";
import { MANAGER_ROLES } from "@/lib/roles";
import { filesFrom, IMAGE_TYPES, MAX_IMAGE_BYTES, removeFiles, uploadFile, UploadError } from "@/lib/storage";
import { appUrl } from "@/lib/urls";
import { fieldErrors, type ActionState } from "@/lib/validation";

const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

const schema = z.object({
  comunidadId: z.string().min(1),
  announcementId: z.string().optional(),
  title: z.string().trim().min(3, "Escribe un título").max(140),
  body: z.string().trim().min(3, "Escribe el mensaje").max(5000),
  pinned: checkbox,
  urgent: checkbox,
  notifyEmail: checkbox,
  removeImage: checkbox,
});

export async function saveAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, announcementId, removeImage, ...data } = parsed.data;
  const { member, comunidad } = await requireMember(comunidadId, MANAGER_ROLES, { feature: "announcements" });

  const existing = announcementId
    ? await db.announcement.findFirst({ where: { id: announcementId, comunidadId } })
    : null;
  if (announcementId && !existing) return { error: "Anuncio no encontrado" };

  let imagePath = existing?.imagePath ?? null;
  const [image] = filesFrom(formData, "image");
  try {
    if (image) {
      const uploaded = await uploadFile(image, {
        folder: `${comunidadId}/announcements`,
        maxBytes: MAX_IMAGE_BYTES,
        allowedTypes: IMAGE_TYPES,
      });
      if (imagePath) await removeFiles([imagePath]);
      imagePath = uploaded;
    } else if (removeImage && imagePath) {
      await removeFiles([imagePath]);
      imagePath = null;
    }
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    throw err;
  }

  if (existing) {
    await db.announcement.update({ where: { id: existing.id }, data: { ...data, imagePath } });
  } else {
    const created = await db.announcement.create({
      data: { ...data, imagePath, comunidadId, authorId: member.id },
    });
    // Author has implicitly read it.
    await db.announcementRead.create({ data: { announcementId: created.id, memberId: member.id } });

    if (data.notifyEmail) {
      const link = appUrl(`/c/${comunidadId}/anuncios#${created.id}`);
      const count = await notifyMembers({
        comunidadId,
        event: "announcement",
        subject: `${data.urgent ? "URGENTE · " : ""}${data.title} — ${comunidad.name}`,
        title: data.title,
        html: `${textToHtml(data.body)}<p style="color:#8a7766;font-size:13px">Publicado por ${escapeHtml(member.displayName)} en ${escapeHtml(comunidad.name)}</p>`,
        text: `${comunidad.name}: ${data.title}\n\n${data.body}`,
        cta: { label: "Ver en Mi Comunidad", href: link },
        excludeMemberIds: [member.id],
      });
      await db.announcement.update({
        where: { id: created.id },
        data: { notifiedAt: new Date(), recipientsCount: count },
      });
    }
  }

  revalidatePath(`/c/${comunidadId}/anuncios`);
  revalidatePath(`/c/${comunidadId}`);
  redirect(`/c/${comunidadId}/anuncios`);
}

export async function togglePin(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const announcementId = String(formData.get("announcementId"));
  await requireMember(comunidadId, MANAGER_ROLES, { feature: "announcements" });
  const a = await db.announcement.findFirst({ where: { id: announcementId, comunidadId } });
  if (!a) return;
  await db.announcement.update({ where: { id: a.id }, data: { pinned: !a.pinned } });
  revalidatePath(`/c/${comunidadId}/anuncios`);
  revalidatePath(`/c/${comunidadId}`);
}

export async function deleteAnnouncement(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const announcementId = String(formData.get("announcementId"));
  await requireMember(comunidadId, MANAGER_ROLES, { feature: "announcements" });
  const a = await db.announcement.findFirst({ where: { id: announcementId, comunidadId } });
  if (!a) return;
  await db.announcement.delete({ where: { id: a.id } });
  if (a.imagePath) await removeFiles([a.imagePath]);
  revalidatePath(`/c/${comunidadId}/anuncios`);
  revalidatePath(`/c/${comunidadId}`);
  redirect(`/c/${comunidadId}/anuncios`);
}
