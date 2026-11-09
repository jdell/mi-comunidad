"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { NativeSelect } from "@/components/app/native-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { INCIDENCIA_STATUS } from "@/lib/labels";
import { updateIncidencia } from "../actions";

export function UpdateIncidenciaForm({
  comunidadId,
  incidenciaId,
  manager,
  status,
  assignedTo,
}: {
  comunidadId: string;
  incidenciaId: string;
  manager: boolean;
  status: keyof typeof INCIDENCIA_STATUS;
  assignedTo: string | null;
}) {
  const [state, action] = useActionState(updateIncidencia, {});
  useActionToast(state);
  return (
    <form action={action} className="space-y-4" key={`${status}-${assignedTo}`}>
      <FormError state={state} />
      <input type="hidden" name="comunidadId" value={comunidadId} />
      <input type="hidden" name="incidenciaId" value={incidenciaId} />
      {manager && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estado" htmlFor="status">
            <NativeSelect id="status" name="status" defaultValue={status}>
              {Object.entries(INCIDENCIA_STATUS).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Asignada a" htmlFor="assignedTo">
            <Input id="assignedTo" name="assignedTo" defaultValue={assignedTo ?? ""} placeholder="Empresa o persona" />
          </Field>
        </div>
      )}
      <Field label={manager ? "Nota (opcional)" : "Añadir comentario"} htmlFor="note">
        <Textarea id="note" name="note" rows={3} placeholder="El técnico viene el jueves por la mañana." />
      </Field>
      <SubmitButton>{manager ? "Guardar" : "Comentar"}</SubmitButton>
    </form>
  );
}
