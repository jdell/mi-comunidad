"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { fieldErrors, type ActionState } from "@/lib/validation";

const schema = z.object({
  name: z.string().trim().min(2, "Indica tu nombre").max(80),
  productEmails: z.preprocess((v) => v === "on", z.boolean()),
});

export async function updateAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/cuenta");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/cuenta");
  return { ok: true, message: "Cuenta actualizada" };
}

/**
 * Right to erasure (GDPR art. 17): anonymise personal data, keep comunidad records
 * (actas, cuotas tied to units) that the comunidad must retain under the LPH.
 */
export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/cuenta");
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "ELIMINAR") {
    return { error: "Escribe ELIMINAR para confirmar." };
  }
  const presidencies = await db.comunidadMember.findMany({
    where: { userId: user.id, role: "PRESIDENT", status: "ACTIVE" },
    include: { comunidad: { select: { name: true } } },
  });
  if (presidencies.length) {
    return {
      error: `Eres presidente de ${presidencies.map((p) => p.comunidad.name).join(", ")}. Transfiere la presidencia antes de eliminar tu cuenta.`,
    };
  }

  await db.$transaction([
    db.comunidadMember.updateMany({
      where: { userId: user.id },
      data: { status: "REMOVED", displayName: "Antiguo vecino", phone: null, email: null, unitId: null, notifyEmail: false, notifyWhatsApp: false },
    }),
    db.invitation.updateMany({ where: { acceptedById: user.id }, data: { name: null, email: null, phone: null } }),
    db.npsResponse.updateMany({ where: { userId: user.id }, data: { comment: null } }),
    db.user.update({ where: { id: user.id }, data: { name: null, email: null, phone: null, productEmails: false, deletedAt: new Date() } }),
  ]);

  const supabase = await createClient();
  await supabase.auth.signOut();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await createAdminClient().auth.admin.deleteUser(user.id).catch(() => {});
  }
  redirect("/?cuenta=eliminada");
}
