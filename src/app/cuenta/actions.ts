"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fieldErrors, type ActionState } from "@/lib/validation";

const schema = z.object({ name: z.string().trim().min(2, "Indica tu nombre").max(80) });

export async function updateAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/cuenta");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/cuenta");
  return { ok: true, message: "Cuenta actualizada" };
}
