import "server-only";
import { db } from "@/lib/db";
import { emailLayout, sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/urls";
import { sendWhatsAppNotification, whatsappConfigured } from "@/lib/whatsapp";
import type { MemberRole } from "@/generated/prisma/enums";

export type NotificationEvent =
  | "announcement"
  | "incidencia_created"
  | "incidencia_updated"
  | "junta_convocatoria"
  | "junta_reminder"
  | "acta_published"
  | "cuota_reminder"
  | "membership"
  | "billing";

/**
 * Legal notices (convocatorias, debt reminders under LPH arts. 16 and 21) also go by
 * email to members who receive WhatsApp, so there is a written record.
 */
const ALWAYS_EMAIL: NotificationEvent[] = ["junta_convocatoria", "cuota_reminder", "acta_published", "billing"];

export interface NotifyOptions {
  comunidadId: string;
  event: NotificationEvent;
  subject: string;
  title: string;
  /** Pre-escaped HTML body for email. */
  html: string;
  /** Plain-text summary (WhatsApp / text email). */
  text: string;
  cta?: { label: string; href: string };
  /** Restrict to these member ids. */
  memberIds?: string[];
  /** Restrict to these roles. */
  roles?: MemberRole[];
  excludeMemberIds?: string[];
}

/**
 * Fan-out a comunidad notification by WhatsApp and/or email according to each
 * member's preferences, logging every delivery attempt. Returns how many members
 * were reached on at least one channel. Never throws.
 */
export async function notifyMembers(opts: NotifyOptions): Promise<number> {
  try {
    const [comunidad, members] = await Promise.all([
      db.comunidad.findUnique({ where: { id: opts.comunidadId }, select: { name: true } }),
      db.comunidadMember.findMany({
        where: {
          comunidadId: opts.comunidadId,
          status: "ACTIVE",
          id: {
            ...(opts.memberIds ? { in: opts.memberIds } : {}),
            ...(opts.excludeMemberIds?.length ? { notIn: opts.excludeMemberIds } : {}),
          },
          ...(opts.roles ? { role: { in: opts.roles } } : {}),
        },
        include: { user: { select: { email: true, phone: true } } },
      }),
    ]);
    if (!comunidad) return 0;

    const link = opts.cta?.href ?? appUrl(`/c/${opts.comunidadId}`);
    const html = emailLayout({ title: opts.title, body: opts.html, cta: opts.cta });
    const useWhatsApp = whatsappConfigured() || process.env.NODE_ENV !== "production";
    const logs: { memberId: string; channel: "EMAIL" | "WHATSAPP"; success: boolean; error?: string }[] = [];

    await Promise.all(
      members.map(async (m) => {
        const phone = m.phone ?? m.user.phone;
        const email = m.email ?? m.user.email;
        let whatsappOk = false;

        if (useWhatsApp && m.notifyWhatsApp && phone) {
          const res = await sendWhatsAppNotification({ to: phone, comunidad: comunidad.name, message: opts.text, link });
          whatsappOk = res.ok;
          logs.push({ memberId: m.id, channel: "WHATSAPP", success: res.ok, error: res.error });
        }

        const wantsEmail = m.notifyEmail || ALWAYS_EMAIL.includes(opts.event);
        if (email && wantsEmail && (!whatsappOk || ALWAYS_EMAIL.includes(opts.event))) {
          const ok = await sendEmail({ to: email, subject: opts.subject, html, text: `${opts.text}\n\n${link}` });
          logs.push({ memberId: m.id, channel: "EMAIL", success: ok });
        }
      }),
    );

    if (logs.length) {
      await db.notificationLog.createMany({
        data: logs.map((l) => ({ comunidadId: opts.comunidadId, memberId: l.memberId, channel: l.channel, event: opts.event, success: l.success, error: l.error })),
      });
    }
    return new Set(logs.filter((l) => l.success).map((l) => l.memberId)).size;
  } catch (err) {
    console.error("[notify] failed", opts.event, err);
    return 0;
  }
}
