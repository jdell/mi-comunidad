"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createIdea } from "./actions";

export function IdeaForm({ comunidadId }: { comunidadId?: string }) {
  const [state, action] = useActionState(createIdea, {});
  const ref = useRef<HTMLFormElement>(null);
  useActionToast(state);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormError state={state} />
      {comunidadId && <input type="hidden" name="comunidadId" value={comunidadId} />}
      <Field label="Título" htmlFor="title" error={state.fieldErrors?.title}>
        <Input id="title" name="title" maxLength={120} placeholder="Ej.: Reservar la pista de pádel desde la app" required />
      </Field>
      <Field
        label="Descripción"
        htmlFor="description"
        error={state.fieldErrors?.description}
        hint="¿Qué problema te resolvería? Cuanto más concreto, mejor. No incluyas datos personales de vecinos."
      >
        <Textarea id="description" name="description" rows={4} maxLength={2000} required />
      </Field>
      <SubmitButton pendingLabel="Enviando…">Enviar sugerencia</SubmitButton>
    </form>
  );
}
