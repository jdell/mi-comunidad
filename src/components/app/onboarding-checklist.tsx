import Link from "next/link";
import { CheckCircle2, ChevronRight, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { OnboardingStep } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

export function OnboardingChecklist({
  comunidadId,
  steps,
  dismissAction,
}: {
  comunidadId: string;
  steps: OnboardingStep[];
  dismissAction: (formData: FormData) => Promise<void>;
}) {
  const done = steps.filter((s) => s.done).length;
  return (
    <Card className="mb-6 border-primary/40">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>Primeros pasos</CardTitle>
          <CardDescription>
            {done} de {steps.length} completados. Deja tu comunidad lista en unos minutos.
          </CardDescription>
        </div>
        <form action={dismissAction}>
          <input type="hidden" name="comunidadId" value={comunidadId} />
          <Button size="icon-sm" variant="ghost" aria-label="Ocultar primeros pasos">
            <X />
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={(done / steps.length) * 100} />
        <ul className="divide-y">
          {steps.map((s) => (
            <li key={s.key}>
              <Link href={s.href} className="flex items-center gap-3 py-2.5 hover:text-primary">
                {s.done ? <CheckCircle2 className="size-5 shrink-0 text-success" /> : <Circle className="size-5 shrink-0 text-muted-foreground" />}
                <span className="min-w-0 flex-1">
                  <span className={cn("block font-medium", s.done && "text-muted-foreground line-through")}>{s.label}</span>
                  {!s.done && <span className="block text-xs text-muted-foreground">{s.hint}</span>}
                </span>
                {!s.done && <ChevronRight className="size-4 text-muted-foreground" />}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
