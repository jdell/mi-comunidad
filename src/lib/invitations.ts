import "server-only";
import { db } from "@/lib/db";
import { normalizeCode } from "@/lib/codes";

/**
 * Resolve an invitation code. Either a comunidad-wide link code
 * (Comunidad.inviteCode) or a personal per-unit Invitation.code.
 */
export async function resolveInviteCode(rawCode: string) {
  const code = normalizeCode(rawCode);
  if (!code) return null;

  const invitation = await db.invitation.findUnique({
    where: { code },
    include: { comunidad: true, unit: true },
  });
  if (invitation) {
    const expired = invitation.expiresAt && invitation.expiresAt < new Date();
    if (invitation.status !== "PENDING" || expired) return { code, comunidad: invitation.comunidad, invitation, invalid: true as const };
    return { code, comunidad: invitation.comunidad, invitation, invalid: false as const };
  }

  const comunidad = await db.comunidad.findUnique({ where: { inviteCode: code } });
  if (!comunidad) return null;
  return { code, comunidad, invitation: null, invalid: false as const };
}

/** Units without an active/pending member, i.e. that can still be claimed. */
export async function unclaimedUnits(comunidadId: string) {
  return db.unit.findMany({
    where: { comunidadId, members: { none: { status: { in: ["ACTIVE", "PENDING"] } } } },
    orderBy: [{ floor: "asc" }, { label: "asc" }],
  });
}
