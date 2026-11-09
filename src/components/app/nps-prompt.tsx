"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { SubmitButton, useActionToast } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/lib/validation";
import { cn } from "@/lib/utils";

export function NpsPrompt({
  comunidadId,
  submitAction,
  dismissAction,
}: {
  comunidadId: string;
  submitAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  dismissAction: (formData: FormData) => Promise<void>;
}) {
  const [state, action] = useActionState(submitAction, {});
  const [score, setScore] = useState<number | null>(null);
  useActionToast(state);
  if (state.ok) return null;

  return (
    <Card className="mb-6">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">¿Qué probabilidad hay de que recomiendes Mi Comunidad a otro presidente o vecino?</p>
          <form action={dismissAction}>
            <input type="hidden" name="comunidadId" value={comunidadId} />
            <Button size="icon-sm" variant="ghost" aria-label="Ahora no">
              <X />
            </Button>
          </form>
        </div>
        <form action={action} className="space-y-3">
          <input type="hidden" name="comunidadId" value={comunidadId} />
          <input type="hidden" name="score" value={score ?? ""} />
          <div className="grid grid-cols-11 gap-1" role="radiogroup" aria-label="Puntuación de 0 a 10">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={score === n}
                onClick={() => setScore(n)}
                className={cn(
                  "h-9 rounded-lg border text-sm font-medium transition-colors",
                  score === n ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Nada probable</span>
            <span>Muy probable</span>
          </div>
          {score !== null && (
            <>
              <Textarea name="comment" rows={2} placeholder={score >= 9 ? "¿Qué es lo que más te gusta?" : "¿Qué podríamos mejorar?"} />
              <SubmitButton size="sm">Enviar</SubmitButton>
            </>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
