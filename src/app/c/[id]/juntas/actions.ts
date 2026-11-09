"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import type { PlanFeature } from "@/lib/plans";
import { db } from "@/lib/db";
import { escapeHtml } from "@/lib/email";
import { formatDateTime } from "@/lib/format";
import { computeJunta, loadJunta, morosoUnitIds, votableUnits } from "@/lib/juntas";
import { noticeError } from "@/lib/lph";
import { notifyMembers } from "@/lib/notifications";
import { MANAGER_ROLES, ROLE_LABELS } from "@/lib/roles";
import { appUrl } from "@/lib/urls";
import { fieldErrors, type ActionState } from "@/lib/validation";

const path = (comunidadId: string, juntaId?: string) => `/c/${comunidadId}/juntas${juntaId ? `/${juntaId}` : ""}`;

function revalidate(comunidadId: string, juntaId?: string) {
  revalidatePath(path(comunidadId));
  if (juntaId) revalidatePath(path(comunidadId, juntaId));
  revalidatePath(`/c/${comunidadId}`);
}

/** datetime-local value ("2026-06-15T19:00") interpreted in Europe/Madrid. */
function parseMadridLocal(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const asUtc = new Date(`${value}:00Z`);
  // Find Madrid's offset at that instant and correct for it.
  const madrid = new Date(asUtc.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  const utc = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(asUtc.getTime() - (madrid.getTime() - utc.getTime()));
}

const agendaItemSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().default(""),
  majority: z.enum(["SIMPLE", "THREE_FIFTHS", "UNANIMITY", "INFORMATIVE"]),
});

const juntaSchema = z.object({
  comunidadId: z.string().min(1),
  juntaId: z.string().optional(),
  type: z.enum(["ORDINARIA", "EXTRAORDINARIA"]),
  scheduledAt: z.string().min(1, "Indica fecha y hora"),
  secondCallMinutes: z.coerce.number().int().min(0).max(24 * 60).default(30),
  location: z.string().trim().min(3, "Indica el lugar").max(200),
  notes: z.string().trim().max(3000).optional(),
  agenda: z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Orden del día no válido" });
        return z.NEVER;
      }
    })
    .pipe(z.array(agendaItemSchema).min(1, "Añade al menos un punto al orden del día").max(30)),
});

export async function saveJunta(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = juntaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, juntaId, agenda, secondCallMinutes, ...data } = parsed.data;
  const { member } = await requireMember(comunidadId, MANAGER_ROLES, { feature: "junta_basic" });

  const scheduledAt = parseMadridLocal(data.scheduledAt);
  if (!scheduledAt) return { error: "Fecha no válida", fieldErrors: { scheduledAt: ["Fecha no válida"] } };
  const notice = noticeError(data.type, scheduledAt);
  if (notice) return { error: notice, fieldErrors: { scheduledAt: [notice] } };

  const values = {
    type: data.type,
    scheduledAt,
    secondCallAt: secondCallMinutes > 0 ? new Date(scheduledAt.getTime() + secondCallMinutes * 60_000) : null,
    location: data.location,
    notes: data.notes || null,
  };
  const items = agenda.map((a, i) => ({ order: i + 1, title: a.title, description: a.description || null, majority: a.majority }));

  let id = juntaId;
  if (juntaId) {
    const existing = await db.junta.findFirst({ where: { id: juntaId, comunidadId } });
    if (!existing) return { error: "Junta no encontrada" };
    if (existing.status !== "DRAFT") return { error: "Solo se puede editar una junta en borrador." };
    await db.$transaction([
      db.agendaItem.deleteMany({ where: { juntaId } }),
      db.junta.update({ where: { id: juntaId }, data: { ...values, agendaItems: { create: items } } }),
    ]);
  } else {
    const created = await db.junta.create({
      data: { ...values, comunidadId, createdById: member.id, agendaItems: { create: items } },
    });
    id = created.id;
  }
  revalidate(comunidadId, id);
  redirect(path(comunidadId, id));
}

async function managerJunta(formData: FormData, feature?: PlanFeature) {
  const comunidadId = String(formData.get("comunidadId"));
  const juntaId = String(formData.get("juntaId"));
  const ctx = await requireMember(comunidadId, MANAGER_ROLES, feature ? { feature } : undefined);
  const junta = await db.junta.findFirst({ where: { id: juntaId, comunidadId } });
  if (!junta) redirect(path(comunidadId));
  return { ...ctx, comunidadId, junta };
}

export async function deleteJunta(formData: FormData) {
  const { comunidadId, junta } = await managerJunta(formData);
  if (junta.status === "DRAFT") await db.junta.delete({ where: { id: junta.id } });
  revalidate(comunidadId);
  redirect(path(comunidadId));
}

export async function cancelJunta(formData: FormData) {
  const { comunidadId, junta, comunidad } = await managerJunta(formData);
  if (junta.status !== "CONVOCADA") return;
  await db.junta.update({ where: { id: junta.id }, data: { status: "CANCELADA" } });
  await notifyMembers({
    comunidadId,
    event: "junta_convocatoria",
    subject: `Junta desconvocada — ${comunidad.name}`,
    title: "Junta desconvocada",
    html: `<p>La junta prevista para el ${escapeHtml(formatDateTime(junta.scheduledAt))} en ${escapeHtml(junta.location)} queda desconvocada.</p>`,
    text: `${comunidad.name}: la junta del ${formatDateTime(junta.scheduledAt)} queda desconvocada.`,
  });
  revalidate(comunidadId, junta.id);
}

function agendaHtml(items: { order: number; title: string }[]) {
  return `<ol style="padding-left:20px;line-height:1.6">${items.map((i) => `<li>${escapeHtml(i.title)}</li>`).join("")}</ol>`;
}

export async function sendConvocatoria(formData: FormData) {
  const { comunidadId, junta, comunidad, member } = await managerJunta(formData, "junta_basic");
  if (junta.status !== "DRAFT") return;
  const notice = noticeError(junta.type, junta.scheduledAt);
  if (notice) redirect(`${path(comunidadId, junta.id)}?error=${encodeURIComponent(notice)}`);

  const items = await db.agendaItem.findMany({ where: { juntaId: junta.id }, orderBy: { order: "asc" } });
  const link = appUrl(path(comunidadId, junta.id));
  const kind = junta.type === "ORDINARIA" ? "ordinaria" : "extraordinaria";
  const count = await notifyMembers({
    comunidadId,
    event: "junta_convocatoria",
    subject: `Convocatoria de junta ${kind} — ${comunidad.name}`,
    title: `Convocatoria de junta ${kind}`,
    html: `<p>Por orden del ${escapeHtml(ROLE_LABELS[member.role].toLowerCase())}, se convoca a los propietarios de <strong>${escapeHtml(comunidad.name)}</strong> a junta general ${kind}:</p>
<p><strong>Primera convocatoria:</strong> ${escapeHtml(formatDateTime(junta.scheduledAt))}<br>${junta.secondCallAt ? `<strong>Segunda convocatoria:</strong> ${escapeHtml(formatDateTime(junta.secondCallAt))}<br>` : ""}<strong>Lugar:</strong> ${escapeHtml(junta.location)}</p>
<p><strong>Orden del día:</strong></p>${agendaHtml(items)}
<p>Si no puedes asistir, puedes delegar tu voto en otro vecino desde la app.</p>`,
    text: `Convocatoria junta ${kind} de ${comunidad.name}: ${formatDateTime(junta.scheduledAt)} en ${junta.location}.`,
    cta: { label: "Ver convocatoria y confirmar asistencia", href: link },
  });
  await db.junta.update({
    where: { id: junta.id },
    data: { status: "CONVOCADA", convocadaAt: new Date(), recipientsCount: count },
  });
  revalidate(comunidadId, junta.id);
}

export async function sendJuntaReminder(formData: FormData) {
  const { comunidadId, junta, comunidad } = await managerJunta(formData, "junta_basic");
  if (junta.status !== "CONVOCADA") return;
  await notifyMembers({
    comunidadId,
    event: "junta_reminder",
    subject: `Recordatorio: junta el ${formatDateTime(junta.scheduledAt)} — ${comunidad.name}`,
    title: "Recordatorio de junta",
    html: `<p>Te recordamos que la junta de <strong>${escapeHtml(comunidad.name)}</strong> se celebra el <strong>${escapeHtml(formatDateTime(junta.scheduledAt))}</strong> en ${escapeHtml(junta.location)}.</p><p>Si no puedes asistir, delega tu voto desde la app.</p>`,
    text: `Recordatorio: junta de ${comunidad.name} el ${formatDateTime(junta.scheduledAt)} en ${junta.location}.`,
    cta: { label: "Ver la junta", href: appUrl(path(comunidadId, junta.id)) },
  });
  await db.junta.update({ where: { id: junta.id }, data: { reminderSentAt: new Date() } });
  revalidate(comunidadId, junta.id);
}

// ─── Vecino actions (before the junta) ──────────────────────────────────

export async function rsvp(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const juntaId = String(formData.get("juntaId"));
  const attending = formData.get("attending") === "yes";
  const { member } = await requireMember(comunidadId, undefined, { feature: "junta_basic" });
  const junta = await db.junta.findFirst({ where: { id: juntaId, comunidadId, status: "CONVOCADA" } });
  if (!junta) return;
  await db.juntaRsvp.upsert({
    where: { juntaId_memberId: { juntaId, memberId: member.id } },
    create: { juntaId, memberId: member.id, attending },
    update: { attending },
  });
  revalidate(comunidadId, juntaId);
}

export async function delegateProxy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const comunidadId = String(formData.get("comunidadId"));
  const juntaId = String(formData.get("juntaId"));
  const toMemberId = String(formData.get("toMemberId") ?? "");
  const { member } = await requireMember(comunidadId, undefined, { feature: "junta_basic" });
  if (!member.unitId) return { error: "Asigna tu vivienda en Ajustes para poder delegar el voto." };
  if (!toMemberId || toMemberId === member.id) return { error: "Elige a otro vecino." };

  const [junta, target] = await Promise.all([
    db.junta.findFirst({ where: { id: juntaId, comunidadId, status: { in: ["CONVOCADA", "EN_CURSO"] } } }),
    db.comunidadMember.findFirst({ where: { id: toMemberId, comunidadId, status: "ACTIVE" } }),
  ]);
  if (!junta || !target) return { error: "No se puede delegar en esta junta." };

  await db.$transaction([
    db.proxyDelegation.upsert({
      where: { juntaId_unitId: { juntaId, unitId: member.unitId } },
      create: { juntaId, unitId: member.unitId, fromMemberId: member.id, toMemberId },
      update: { fromMemberId: member.id, toMemberId },
    }),
    db.juntaRsvp.upsert({
      where: { juntaId_memberId: { juntaId, memberId: member.id } },
      create: { juntaId, memberId: member.id, attending: false },
      update: { attending: false },
    }),
  ]);
  revalidate(comunidadId, juntaId);
  return { ok: true, message: `Has delegado tu voto en ${target.displayName}` };
}

export async function revokeProxy(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const juntaId = String(formData.get("juntaId"));
  const { member } = await requireMember(comunidadId);
  await db.proxyDelegation.deleteMany({ where: { juntaId, fromMemberId: member.id, junta: { status: "CONVOCADA" } } });
  revalidate(comunidadId, juntaId);
}

// ─── Live junta (manager) ───────────────────────────────────────────────

export async function startJunta(formData: FormData) {
  const { comunidadId, junta, member } = await managerJunta(formData, "voting");
  if (junta.status !== "CONVOCADA") return;
  const secondCall = formData.get("call") === "second";
  const president = await db.comunidadMember.findFirst({ where: { comunidadId, role: "PRESIDENT", status: "ACTIVE" } });
  const secretary = await db.comunidadMember.findFirst({ where: { comunidadId, role: "SECRETARY", status: "ACTIVE" } });

  // Pre-fill attendance with proxies.
  const proxies = await db.proxyDelegation.findMany({ where: { juntaId: junta.id }, include: { toMember: true } });
  await db.$transaction([
    db.junta.update({
      where: { id: junta.id },
      data: {
        status: "EN_CURSO",
        startedAt: new Date(),
        heldOnSecondCall: secondCall,
        presidentName: president?.displayName ?? member.displayName,
        secretaryName: secretary?.displayName ?? president?.displayName ?? member.displayName,
      },
    }),
    ...proxies.map((p) =>
      db.juntaAttendance.upsert({
        where: { juntaId_unitId: { juntaId: junta.id, unitId: p.unitId } },
        create: { juntaId: junta.id, unitId: p.unitId, type: "PROXY", representativeName: p.toMember.displayName },
        update: {},
      }),
    ),
  ]);
  revalidate(comunidadId, junta.id);
}

export async function saveAttendance(formData: FormData) {
  const { comunidadId, junta } = await managerJunta(formData, "voting");
  if (junta.status !== "EN_CURSO") return;
  const units = await db.unit.findMany({ where: { comunidadId }, select: { id: true } });
  const ops = [];
  for (const u of units) {
    const value = String(formData.get(`att:${u.id}`) ?? "ABSENT");
    const rep = String(formData.get(`rep:${u.id}`) ?? "").trim() || null;
    if (value === "IN_PERSON" || value === "PROXY" || value === "REMOTE") {
      ops.push(
        db.juntaAttendance.upsert({
          where: { juntaId_unitId: { juntaId: junta.id, unitId: u.id } },
          create: { juntaId: junta.id, unitId: u.id, type: value, representativeName: value === "PROXY" ? rep : null },
          update: { type: value, representativeName: value === "PROXY" ? rep : null },
        }),
      );
    } else {
      ops.push(db.juntaAttendance.deleteMany({ where: { juntaId: junta.id, unitId: u.id } }));
    }
  }
  await db.$transaction(ops);
  revalidate(comunidadId, junta.id);
}

export async function setVoting(formData: FormData) {
  const { comunidadId, junta } = await managerJunta(formData, "voting");
  const itemId = String(formData.get("itemId"));
  const open = formData.get("open") === "true";
  if (junta.status !== "EN_CURSO") return;
  const item = await db.agendaItem.findFirst({ where: { id: itemId, juntaId: junta.id } });
  if (!item || item.majority === "INFORMATIVE") return;

  if (open) {
    await db.$transaction([
      db.agendaItem.updateMany({ where: { juntaId: junta.id }, data: { votingOpen: false } }),
      db.agendaItem.update({ where: { id: item.id }, data: { votingOpen: true, votingDone: false, result: null } }),
    ]);
  } else {
    // Close and compute the result.
    const loaded = await loadJunta(comunidadId, junta.id);
    if (!loaded) return;
    const morosos = await morosoUnitIds(comunidadId, junta.startedAt ?? new Date());
    const tally = computeJunta(loaded, morosos).items.find((i) => i.item.id === item.id)!.tally;
    await db.agendaItem.update({ where: { id: item.id }, data: { votingOpen: false, votingDone: true, result: tally.result } });
  }
  revalidate(comunidadId, junta.id);
}

/** Manager records votes for present units (e.g. show of hands in the room). */
export async function recordVotes(formData: FormData) {
  const { comunidadId, junta, member } = await managerJunta(formData, "voting");
  const itemId = String(formData.get("itemId"));
  if (junta.status !== "EN_CURSO") return;
  const item = await db.agendaItem.findFirst({ where: { id: itemId, juntaId: junta.id, votingOpen: true } });
  if (!item) return;
  const [attendances, morosos] = await Promise.all([
    db.juntaAttendance.findMany({ where: { juntaId: junta.id } }),
    morosoUnitIds(comunidadId, junta.startedAt ?? new Date()),
  ]);
  const ops = [];
  for (const a of attendances) {
    if (morosos.has(a.unitId)) continue;
    const choice = String(formData.get(`vote:${a.unitId}`) ?? "");
    if (choice === "YES" || choice === "NO" || choice === "ABSTAIN") {
      ops.push(
        db.vote.upsert({
          where: { agendaItemId_unitId: { agendaItemId: item.id, unitId: a.unitId } },
          create: { agendaItemId: item.id, unitId: a.unitId, choice, castByMemberId: member.id },
          update: { choice, castByMemberId: member.id, castAt: new Date() },
        }),
      );
    } else {
      ops.push(db.vote.deleteMany({ where: { agendaItemId: item.id, unitId: a.unitId } }));
    }
  }
  await db.$transaction(ops);
  revalidate(comunidadId, junta.id);
}

export async function setResolution(formData: FormData) {
  const { comunidadId, junta } = await managerJunta(formData, "actas");
  const itemId = String(formData.get("itemId"));
  const resolution = String(formData.get("resolution") ?? "").trim().slice(0, 4000);
  if (!["EN_CURSO", "CERRADA"].includes(junta.status)) return;
  await db.agendaItem.updateMany({ where: { id: itemId, juntaId: junta.id }, data: { resolution: resolution || null } });
  revalidate(comunidadId, junta.id);
}

export async function closeJunta(formData: FormData) {
  const { comunidadId, junta } = await managerJunta(formData, "voting");
  if (junta.status !== "EN_CURSO") return;
  const loaded = await loadJunta(comunidadId, junta.id);
  if (!loaded) return;
  const morosos = await morosoUnitIds(comunidadId, junta.startedAt ?? new Date());
  const computed = computeJunta(loaded, morosos);
  await db.$transaction([
    ...computed.items
      .filter(({ item }) => !item.votingDone)
      .map(({ item, tally }) =>
        db.agendaItem.update({
          where: { id: item.id },
          data: { votingOpen: false, votingDone: true, result: item.votes.length || item.majority === "INFORMATIVE" ? tally.result : "NO_VOTE" },
        }),
      ),
    db.junta.update({ where: { id: junta.id }, data: { status: "CERRADA", closedAt: new Date() } }),
  ]);
  revalidate(comunidadId, junta.id);
  redirect(`${path(comunidadId, junta.id)}/acta`);
}

export async function saveActaNotes(formData: FormData) {
  const { comunidadId, junta } = await managerJunta(formData, "actas");
  if (junta.status !== "CERRADA") return;
  const actaNotes = String(formData.get("actaNotes") ?? "").trim().slice(0, 10_000);
  await db.junta.update({ where: { id: junta.id }, data: { actaNotes: actaNotes || null } });
  revalidatePath(`${path(comunidadId, junta.id)}/acta`);
}

export async function publishActa(formData: FormData) {
  const { comunidadId, junta, comunidad } = await managerJunta(formData, "actas");
  if (junta.status !== "CERRADA") return;
  await db.junta.update({ where: { id: junta.id }, data: { actaPublishedAt: new Date() } });
  await notifyMembers({
    comunidadId,
    event: "acta_published",
    subject: `Acta de la junta del ${formatDateTime(junta.scheduledAt)} — ${comunidad.name}`,
    title: "Acta de la junta disponible",
    html: `<p>Ya está disponible el acta de la junta celebrada el ${escapeHtml(formatDateTime(junta.scheduledAt))}. Según la LPH (art. 17.8), los propietarios ausentes disponen de 30 días naturales para manifestar su discrepancia con los acuerdos.</p>`,
    text: `${comunidad.name}: ya está disponible el acta de la junta del ${formatDateTime(junta.scheduledAt)}.`,
    cta: { label: "Leer el acta", href: appUrl(`${path(comunidadId, junta.id)}/acta`) },
  });
  revalidate(comunidadId, junta.id);
}

// ─── Vecino voting ──────────────────────────────────────────────────────

export async function castVote(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const juntaId = String(formData.get("juntaId"));
  const itemId = String(formData.get("itemId"));
  const unitId = String(formData.get("unitId"));
  const choice = String(formData.get("choice"));
  if (choice !== "YES" && choice !== "NO" && choice !== "ABSTAIN") return;
  const { member } = await requireMember(comunidadId, undefined, { feature: "voting" });

  const loaded = await loadJunta(comunidadId, juntaId);
  if (!loaded || loaded.junta.status !== "EN_CURSO") return;
  const item = loaded.junta.agendaItems.find((i) => i.id === itemId && i.votingOpen);
  if (!item) return;
  const morosos = await morosoUnitIds(comunidadId, loaded.junta.startedAt ?? new Date());
  const allowed = votableUnits(loaded, member.id, member.unitId, morosos).some((u) => u.id === unitId);
  if (!allowed) return;

  const isProxy = loaded.junta.proxies.some((p) => p.unitId === unitId && p.toMemberId === member.id);
  await db.$transaction([
    db.vote.upsert({
      where: { agendaItemId_unitId: { agendaItemId: item.id, unitId } },
      create: { agendaItemId: item.id, unitId, choice, castByMemberId: member.id },
      update: { choice, castByMemberId: member.id, castAt: new Date() },
    }),
    // Voting in-app registers attendance (remote or by proxy).
    db.juntaAttendance.upsert({
      where: { juntaId_unitId: { juntaId, unitId } },
      create: { juntaId, unitId, type: isProxy ? "PROXY" : "REMOTE", representativeName: isProxy ? member.displayName : null },
      update: {},
    }),
  ]);
  revalidate(comunidadId, juntaId);
}

