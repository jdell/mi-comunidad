"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { escapeHtml, textToHtml } from "@/lib/email";
import { INCIDENCIA_LOCATION, INCIDENCIA_STATUS } from "@/lib/labels";
import { notifyMembers } from "@/lib/notifications";
import { MANAGER_ROLES, isManager } from "@/lib/roles";
import { filesFrom, IMAGE_TYPES, MAX_IMAGE_BYTES, uploadFile, UploadError } from "@/lib/storage";
import { appUrl } from "@/lib/urls";
import { fieldErrors, type ActionState } from "@/lib/validation";

const createSchema = z.object({
  comunidadId: z.string().min(1),
  title: z.string().trim().min(3, "Resume el problema").max(120),
  description: z.string().trim().min(5, "Describe qué ha pasado").max(3000),
  location: z.enum(["PORTAL", "ESCALERA", "ASCENSOR", "GARAJE", "TERRAZA", "FACHADA", "PISCINA", "ZONAS_COMUNES", "OTRO"]),
  priority: z.enum(["NORMAL", "URGENT"]),
});

export async function createIncidencia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, ...data } = parsed.data;
  const { member, comunidad } = await requireMember(comunidadId, undefined, { feature: "incidencias" });

  const photos = filesFrom(formData, "photos").slice(0, 4);
  let photoPaths: string[] = [];
  try {
    photoPaths = await Promise.all(
      photos.map((file) =>
        uploadFile(file, { folder: `${comunidadId}/incidencias`, maxBytes: MAX_IMAGE_BYTES, allowedTypes: IMAGE_TYPES }),
      ),
    );
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    throw err;
  }

  const incidencia = await db.incidencia.create({
    data: { ...data, comunidadId, reporterId: member.id, photoPaths },
  });

  await notifyMembers({
    comunidadId,
    event: "incidencia_created",
    roles: MANAGER_ROLES,
    excludeMemberIds: [member.id],
    subject: `${data.priority === "URGENT" ? "URGENTE · " : ""}Nueva incidencia: ${data.title}`,
    title: `Nueva incidencia en ${comunidad.name}`,
    html: `<p><strong>${escapeHtml(data.title)}</strong> · ${INCIDENCIA_LOCATION[data.location]}</p>${textToHtml(data.description)}<p style="color:#8a7766;font-size:13px">Reportada por ${escapeHtml(member.displayName)}</p>`,
    text: `Nueva incidencia en ${comunidad.name}: ${data.title} (${INCIDENCIA_LOCATION[data.location]})`,
    cta: { label: "Ver incidencia", href: appUrl(`/c/${comunidadId}/incidencias/${incidencia.id}`) },
  });

  revalidatePath(`/c/${comunidadId}/incidencias`);
  revalidatePath(`/c/${comunidadId}`);
  redirect(`/c/${comunidadId}/incidencias/${incidencia.id}`);
}

const updateSchema = z.object({
  comunidadId: z.string().min(1),
  incidenciaId: z.string().min(1),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
  assignedTo: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2000).optional(),
});

export async function updateIncidencia(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, incidenciaId, status, assignedTo, note } = parsed.data;
  const { member, comunidad } = await requireMember(comunidadId, undefined, { feature: "incidencias" });

  const incidencia = await db.incidencia.findFirst({ where: { id: incidenciaId, comunidadId } });
  if (!incidencia) return { error: "Incidencia no encontrada" };

  const manager = isManager(member.role);
  const isReporter = incidencia.reporterId === member.id;
  // Vecinos can only comment; managers change status/assignee.
  if (!manager && !isReporter && !note) return { error: "No tienes permiso." };
  const statusChanged = manager && status && status !== incidencia.status ? status : undefined;
  const assigneeChanged = manager && assignedTo !== undefined && assignedTo !== (incidencia.assignedTo ?? "");

  if (!statusChanged && !assigneeChanged && !note) return { error: "No hay cambios que guardar." };

  await db.$transaction([
    db.incidencia.update({
      where: { id: incidencia.id },
      data: {
        ...(statusChanged ? { status: statusChanged, resolvedAt: statusChanged === "RESOLVED" ? new Date() : null } : {}),
        ...(assigneeChanged ? { assignedTo: assignedTo || null } : {}),
      },
    }),
    db.incidenciaUpdate.create({
      data: {
        incidenciaId: incidencia.id,
        authorId: member.id,
        status: statusChanged ?? null,
        note: note || (assigneeChanged ? `Asignada a: ${assignedTo || "nadie"}` : null),
      },
    }),
  ]);

  if (statusChanged && incidencia.reporterId !== member.id) {
    await notifyMembers({
      comunidadId,
      event: "incidencia_updated",
      memberIds: [incidencia.reporterId],
      subject: `Tu incidencia "${incidencia.title}" está ${INCIDENCIA_STATUS[statusChanged].label.toLowerCase()}`,
      title: `Incidencia ${INCIDENCIA_STATUS[statusChanged].label.toLowerCase()}`,
      html: `<p>La incidencia <strong>${escapeHtml(incidencia.title)}</strong> de ${escapeHtml(comunidad.name)} ha cambiado a <strong>${INCIDENCIA_STATUS[statusChanged].label}</strong>.</p>${note ? textToHtml(note) : ""}`,
      text: `${comunidad.name}: la incidencia "${incidencia.title}" está ${INCIDENCIA_STATUS[statusChanged].label.toLowerCase()}.`,
      cta: { label: "Ver incidencia", href: appUrl(`/c/${comunidadId}/incidencias/${incidencia.id}`) },
    });
  }

  revalidatePath(`/c/${comunidadId}/incidencias/${incidencia.id}`);
  revalidatePath(`/c/${comunidadId}/incidencias`);
  revalidatePath(`/c/${comunidadId}`);
  return { ok: true, message: "Incidencia actualizada" };
}
