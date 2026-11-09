import { z } from "zod";

// Spanish CIF: letter + 7 digits + control (digit or letter). Comunidades use "H".
export const cifSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-SUVW]\d{7}[0-9A-J]$/, "CIF no válido (ej. H12345678)");

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\+?\d{9,15}$/, "Teléfono no válido"));

/** Normalise a Spanish phone to E.164 (+34...). */
export function toE164(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.length === 9) return `+34${digits}`;
  return `+${digits}`;
}

export type ActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  data?: Record<string, string>;
  fieldErrors?: Record<string, string[] | undefined>;
};

export function fieldErrors(error: z.ZodError): ActionState {
  return {
    error: "Revisa los campos marcados.",
    fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[] | undefined>,
  };
}
