// Feature idea board ("Sugerencias"): Spanish labels and validation shared by the board and /admin. Client-safe.
import { z } from "zod";
import type { IdeaStatus } from "@/generated/prisma/enums";

export const IDEA_STATUSES = ["NEW", "REVIEWING", "PLANNED", "COMPLETED", "DISMISSED"] as const satisfies readonly IdeaStatus[];

export const IDEA_STATUS: Record<IdeaStatus, { label: string; description: string; className: string }> = {
  NEW: { label: "Nueva", description: "Recibida, pendiente de revisar", className: "bg-muted text-foreground border-transparent" },
  REVIEWING: { label: "En estudio", description: "La estamos valorando", className: "bg-accent text-accent-foreground border-transparent" },
  PLANNED: { label: "Planificada", description: "Está en nuestra hoja de ruta", className: "bg-warning text-warning-foreground border-transparent" },
  COMPLETED: { label: "Disponible", description: "Ya puedes usarla", className: "bg-success text-success-foreground border-transparent" },
  DISMISSED: { label: "Descartada", description: "De momento no la haremos", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

/** Ideas in these statuses can still be voted on. */
export const VOTABLE_STATUSES: readonly IdeaStatus[] = ["NEW", "REVIEWING", "PLANNED"];

export const IDEA_SORTS = { populares: "Más votadas", recientes: "Más recientes" } as const;
export type IdeaSort = keyof typeof IDEA_SORTS;

/** Max ideas a user can submit per 24 h (spam guard). */
export const IDEAS_PER_DAY = 5;

export const ideaSchema = z.object({
  title: z.string().trim().min(6, "Escribe un título de al menos 6 caracteres").max(120, "Máximo 120 caracteres"),
  description: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más (mínimo 10 caracteres)")
    .max(2000, "Máximo 2000 caracteres"),
});

export function votesLabel(n: number) {
  return n === 1 ? "1 voto" : `${n} votos`;
}
