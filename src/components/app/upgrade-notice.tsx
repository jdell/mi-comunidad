import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpgradeNotice({ comunidadId, feature }: { comunidadId: string; feature: string }) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-primary/40 bg-accent/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="font-medium">{feature} forma parte del plan Comunidad</p>
          <p className="text-sm text-muted-foreground">Puedes consultar los datos existentes. Para crear o modificar, mejora tu plan (desde 9 €/mes).</p>
        </div>
      </div>
      <Button asChild size="sm">
        <Link href={`/c/${comunidadId}/plan`}>Ver planes</Link>
      </Button>
    </div>
  );
}
