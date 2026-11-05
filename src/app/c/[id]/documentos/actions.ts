"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { db } from "@/lib/db";
import { MANAGER_ROLES } from "@/lib/roles";
import { DOCUMENT_TYPES, filesFrom, MAX_DOCUMENT_BYTES, removeFiles, uploadFile, UploadError } from "@/lib/storage";
import { fieldErrors, type ActionState } from "@/lib/validation";

const currentYear = new Date().getFullYear();

const schema = z.object({
  comunidadId: z.string().min(1),
  title: z.string().trim().min(2, "Pon un título").max(160),
  category: z.enum(["ACTA", "ESTATUTOS", "SEGURO", "PRESUPUESTO", "CONTRATO", "FACTURA", "CERTIFICADO", "OTRO"]),
  year: z.coerce.number().int().min(1950).max(currentYear + 1),
});

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrors(parsed.error);
  const { comunidadId, ...data } = parsed.data;
  const { member } = await requireMember(comunidadId, MANAGER_ROLES);

  const [file] = filesFrom(formData, "file");
  if (!file) return { error: "Selecciona un archivo." };

  let storagePath: string;
  try {
    storagePath = await uploadFile(file, {
      folder: `${comunidadId}/documents/${data.year}`,
      maxBytes: MAX_DOCUMENT_BYTES,
      allowedTypes: DOCUMENT_TYPES,
    });
  } catch (err) {
    if (err instanceof UploadError) return { error: err.message };
    throw err;
  }

  await db.document.create({
    data: {
      ...data,
      comunidadId,
      uploadedById: member.id,
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });
  revalidatePath(`/c/${comunidadId}/documentos`);
  return { ok: true, message: "Documento subido" };
}

export async function deleteDocument(formData: FormData) {
  const comunidadId = String(formData.get("comunidadId"));
  const documentId = String(formData.get("documentId"));
  await requireMember(comunidadId, MANAGER_ROLES);
  const doc = await db.document.findFirst({ where: { id: documentId, comunidadId } });
  if (!doc) return;
  await db.document.delete({ where: { id: doc.id } });
  await removeFiles([doc.storagePath]);
  revalidatePath(`/c/${comunidadId}/documentos`);
}
