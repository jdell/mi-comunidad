import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import type { Entitlements } from "@/lib/entitlements";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Top-of-app notice for trial, read-only and payment problems. */
export function PlanBanner({
  comunidadId,
  entitlements: e,
  unitsCount,
  canManage,
}: {
  comunidadId: string;
  entitlements: Entitlements;
  unitsCount: number;
  canManage: boolean;
}) {
  const href = `/c/${comunidadId}/plan`;
  let tone: "info" | "warning" | "danger" | null = null;
  let text = "";

  if (e.readOnly) {
    tone = "danger";
    text = `Modo solo lectura: ${unitsCount} viviendas superan el límite del plan ${PLANS[e.plan].name} (${e.unitLimit}).`;
  } else if (e.pastDue) {
    tone = "warning";
    text = "No hemos podido cobrar la suscripción. Actualiza el método de pago.";
  } else if (e.trialActive && e.trialDaysLeft <= 7) {
    tone = "info";
    text = `Prueba del plan Comunidad: ${e.trialDaysLeft === 1 ? "queda 1 día" : `quedan ${e.trialDaysLeft} días`}.`;
  }
  if (!tone) return null;

  return (
    <div
      className={cn(
        "no-print flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm",
        tone === "danger" && "bg-destructive text-white",
        tone === "warning" && "bg-warning text-warning-foreground",
        tone === "info" && "bg-accent text-accent-foreground",
      )}
    >
      {tone === "info" ? <Sparkles className="size-4" /> : <AlertTriangle className="size-4" />}
      <span>{text}</span>
      {canManage && (
        <Link href={href} className="font-semibold underline underline-offset-2">
          Elegir plan
        </Link>
      )}
    </div>
  );
}
