"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/app/form";
import { NativeSelect } from "@/components/app/native-select";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INCIDENCIA_LOCATION } from "@/lib/labels";
import { createIncidencia } from "./actions";

export function NewIncidenciaForm({ comunidadId }: { comunidadId: string }) {
  const [state, action] = useActionState(createIncidencia, {});
  const e = state.fieldErrors ?? {};
  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-5">
          <FormError state={state} />
          <input type="hidden" name="comunidadId" value={comunidadId} />
          <Field label="¿Qué ha pasado?" htmlFor="title" error={e.title}>
            <Input id="title" name="title" placeholder="Gotera en el garaje, plaza 12" required />
          </Field>
          <Field label="Descripción" htmlFor="description" error={e.description}>
            <Textarea id="description" name="description" rows={5} placeholder="Lleva goteando desde ayer por la tarde…" required />
          </Field>
          <Field label="Ubicación" htmlFor="location" error={e.location}>
            <NativeSelect id="location" name="location" defaultValue="OTRO">
              {Object.entries(INCIDENCIA_LOCATION).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Fotos (hasta 4)" htmlFor="photos" hint="Una foto ayuda mucho a entender el problema.">
            <Input id="photos" name="photos" type="file" accept="image/*" multiple />
          </Field>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Urgencia</legend>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="priority" value="NORMAL" defaultChecked className="accent-primary" /> Normal
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="priority" value="URGENT" className="accent-primary" /> Urgente
              </label>
            </div>
          </fieldset>
          <SubmitButton className="h-11 w-full sm:w-auto" pendingLabel="Enviando…">Enviar incidencia</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
