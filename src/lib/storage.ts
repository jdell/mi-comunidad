import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";

/** Single private bucket; objects are namespaced by comunidad id. Access via signed URLs only. */
export const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "comunidad-files";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

let bucketChecked = false;

function storageConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function ensureBucket() {
  if (bucketChecked) return;
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) await supabase.storage.createBucket(BUCKET, { public: false });
  bucketChecked = true;
}

export function safeFileName(name: string) {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return base.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-80) || "archivo";
}

export class UploadError extends Error {}

/** Validate and upload a File. Returns the storage path. */
export async function uploadFile(
  file: File,
  opts: { folder: string; maxBytes: number; allowedTypes: string[] },
): Promise<string> {
  if (!storageConfigured()) throw new UploadError("El almacenamiento de archivos no está configurado.");
  if (file.size === 0) throw new UploadError("El archivo está vacío.");
  if (file.size > opts.maxBytes) {
    throw new UploadError(`El archivo supera el máximo de ${Math.round(opts.maxBytes / 1024 / 1024)} MB.`);
  }
  if (!opts.allowedTypes.includes(file.type)) throw new UploadError("Tipo de archivo no permitido.");

  await ensureBucket();
  const path = `${opts.folder}/${randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new UploadError("No se pudo subir el archivo. Inténtalo de nuevo.");
  return path;
}

export async function removeFiles(paths: string[]) {
  if (!storageConfigured() || paths.length === 0) return;
  await createAdminClient().storage.from(BUCKET).remove(paths);
}

/** Signed URL for one object (default 1 hour). */
export async function signedUrl(path: string, opts?: { expiresIn?: number; download?: string }) {
  if (!storageConfigured()) return null;
  const { data } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, opts?.expiresIn ?? 3600, opts?.download ? { download: opts.download } : undefined);
  return data?.signedUrl ?? null;
}

/** Batch signed URLs, keyed by path. */
export async function signedUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!storageConfigured() || unique.length === 0) return {};
  const { data } = await createAdminClient().storage.from(BUCKET).createSignedUrls(unique, expiresIn);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

/** Read real File entries from a FormData field (browsers send an empty File when nothing is chosen). */
export function filesFrom(formData: FormData, field: string): File[] {
  return formData.getAll(field).filter((v): v is File => v instanceof File && v.size > 0);
}
