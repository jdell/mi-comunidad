import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/generated/prisma/client";

/** Returns the Supabase auth user, or null. Deduplicated per request. */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Returns the app User row for the current session, creating it on first
 * sign-in (we mirror Supabase auth users into our own table).
 */
export const getCurrentUser = cache(async () => {
  const authUser = await getAuthUser();
  if (!authUser) return null;

  const email = authUser.email || null;
  const phone = authUser.phone ? `+${authUser.phone.replace(/^\+/, "")}` : null;
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (authUser.user_metadata?.name as string | undefined) ??
    null;

  const existing = await db.user.findUnique({ where: { id: authUser.id } });
  if (existing) {
    if ((email && existing.email !== email) || (phone && existing.phone !== phone)) {
      return db.user.update({
        where: { id: authUser.id },
        data: { email: email ?? existing.email, phone: phone ?? existing.phone },
      });
    }
    return existing;
  }

  return db.user.create({ data: { id: authUser.id, email, phone, name } });
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/**
 * Loads the current user's ACTIVE membership in a comunidad, or 404s.
 * Pass `roles` to restrict to specific roles (403-equivalent: 404 to avoid leaking).
 */
export const requireMember = cache(async (comunidadId: string, roles?: MemberRole[]) => {
  const user = await requireUser(`/c/${comunidadId}`);
  const member = await db.comunidadMember.findUnique({
    where: { comunidadId_userId: { comunidadId, userId: user.id } },
    include: { comunidad: true, unit: true },
  });
  if (!member || member.status !== "ACTIVE") notFound();
  if (roles && !roles.includes(member.role)) notFound();
  return { user, member, comunidad: member.comunidad };
});
