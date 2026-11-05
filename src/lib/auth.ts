import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { Comunidad, MemberRole } from "@/generated/prisma/client";
import { computeEntitlements, hasFeature } from "@/lib/entitlements";
import type { PlanFeature } from "@/lib/plans";

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
      // Best effort: a stale row may still hold that email/phone (unique). Never block sign-in on it.
      return db.user
        .update({ where: { id: authUser.id }, data: { email: email ?? existing.email, phone: phone ?? existing.phone } })
        .catch(() => existing);
    }
    return existing;
  }

  try {
    return await db.user.create({ data: { id: authUser.id, email, phone, name } });
  } catch {
    // Contact already attached to another (stale) row: create without it.
    return db.user.upsert({ where: { id: authUser.id }, create: { id: authUser.id, name }, update: {} });
  }
});

export async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/**
 * Effective plan entitlements. An Administrador subscription held on any comunidad
 * where this comunidad's president is also president covers this one too.
 */
export const getEntitlements = cache(async (comunidad: Comunidad) => {
  let adminCovered = false;
  const base = computeEntitlements(comunidad);
  if (!base.paid) {
    const presidents = await db.comunidadMember.findMany({
      where: { comunidadId: comunidad.id, role: "PRESIDENT", status: "ACTIVE" },
      select: { userId: true },
    });
    if (presidents.length) {
      adminCovered =
        (await db.comunidad.count({
          where: {
            id: { not: comunidad.id },
            plan: "ADMINISTRADOR",
            subscriptionStatus: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
            members: { some: { role: "PRESIDENT", status: "ACTIVE", userId: { in: presidents.map((p) => p.userId) } } },
          },
        })) > 0;
    }
  }
  return adminCovered ? computeEntitlements(comunidad, { adminCovered }) : base;
});

export interface RequireMemberOptions {
  /** Mutation: blocked when the comunidad is read-only (over its plan's unit limit). */
  write?: boolean;
  /** Plan feature required (implies write). */
  feature?: PlanFeature;
}

/**
 * Loads the current user's ACTIVE membership in a comunidad, or 404s.
 * Pass `roles` to restrict to specific roles (403-equivalent: 404 to avoid leaking).
 * Pass `opts.write` / `opts.feature` from server actions to enforce plan gating:
 * the user is redirected to the plan page explaining why.
 */
export const requireMember = cache(
  async (comunidadId: string, roles?: MemberRole[], opts?: RequireMemberOptions) => {
    const user = await requireUser(`/c/${comunidadId}`);
    const member = await db.comunidadMember.findUnique({
      where: { comunidadId_userId: { comunidadId, userId: user.id } },
      include: { comunidad: true, unit: true },
    });
    if (!member || member.status !== "ACTIVE") notFound();
    if (roles && !roles.includes(member.role)) notFound();

    if (opts?.write || opts?.feature) {
      const entitlements = await getEntitlements(member.comunidad);
      if (entitlements.readOnly) redirect(`/c/${comunidadId}/plan?motivo=limite`);
      if (opts.feature && !hasFeature(entitlements, opts.feature)) {
        redirect(`/c/${comunidadId}/plan?motivo=${opts.feature}`);
      }
    }
    return { user, member, comunidad: member.comunidad };
  },
);
