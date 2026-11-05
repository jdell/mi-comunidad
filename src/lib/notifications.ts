import "server-only";
import { db } from "@/lib/db";
import { emailLayout, sendBulkEmail } from "@/lib/email";
import type { MemberRole } from "@/generated/prisma/enums";

export type NotificationEvent =
  | "announcement"
  | "incidencia_created"
  | "incidencia_updated"
  | "junta_convocatoria"
  | "junta_reminder"
  | "cuota_reminder";

export interface NotifyOptions {
  comunidadId: string;
  event: NotificationEvent;
  subject: string;
  title: string;
  /** Pre-escaped HTML body for email. */
  html: string;
  /** Plain-text summary (used by short channels like WhatsApp). */
  text: string;
  cta?: { label: string; href: string };
  /** Restrict to these member ids. */
  memberIds?: string[];
  /** Restrict to these roles. */
  roles?: MemberRole[];
  excludeMemberIds?: string[];
}

/**
 * Fan-out a comunidad notification to members according to their preferences.
 * Returns the number of members reached. Never throws.
 */
export async function notifyMembers(opts: NotifyOptions): Promise<number> {
  try {
    const members = await db.comunidadMember.findMany({
      where: {
        comunidadId: opts.comunidadId,
        status: "ACTIVE",
        id: {
          ...(opts.memberIds ? { in: opts.memberIds } : {}),
          ...(opts.excludeMemberIds?.length ? { notIn: opts.excludeMemberIds } : {}),
        },
        ...(opts.roles ? { role: { in: opts.roles } } : {}),
      },
      include: { user: { select: { email: true } } },
    });

    const emails = members
      .filter((m) => m.notifyEmail)
      .map((m) => m.email ?? m.user.email)
      .filter((e): e is string => Boolean(e));

    const html = emailLayout({ title: opts.title, body: opts.html, cta: opts.cta });
    const sent = await sendBulkEmail(emails, () => ({ subject: opts.subject, html, text: opts.text }));
    return sent;
  } catch (err) {
    console.error("[notify] failed", opts.event, err);
    return 0;
  }
}
