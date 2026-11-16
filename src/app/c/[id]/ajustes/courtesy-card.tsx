import Link from "next/link";
import { Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Entitlements } from "@/lib/entitlements";
import { formatDate } from "@/lib/format";
import { PLANS } from "@/lib/plans";

/** Courtesy Pro status (admin grant). Renders nothing when there is no active grant. */
export function CourtesyCard({ comunidadId, entitlements: e, canManage }: { comunidadId: string; entitlements: Entitlements; canManage: boolean }) {
  if (!e.courtesy || !e.courtesyEndsAt) return null;
  const plan = PLANS[e.plan];
  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Gift className="size-5 text-primary" /> {plan.name} de cortesía
          <Badge variant="secondary">{e.courtesyDaysLeft === 1 ? "Queda 1 día" : `Quedan ${e.courtesyDaysLeft} días`}</Badge>
        </CardTitle>
        <CardDescription>
          El equipo de Mi Comunidad ha activado gratis el plan {plan.name} para esta comunidad hasta el{" "}
          <strong>{formatDate(e.courtesyEndsAt)}</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Incluye cuotas con recordatorios, votaciones y actas automáticas, derramas, analíticas y marca personalizada.
          Al terminar, la comunidad volverá a su plan anterior salvo que se suscriba; no se pierde ningún dato.
        </p>
        {canManage && (
          <Button asChild size="sm">
            <Link href={`/c/${comunidadId}/plan`}>Suscribirme para mantenerlo</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
