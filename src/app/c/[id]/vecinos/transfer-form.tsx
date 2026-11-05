"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/app/form";
import { NativeSelect } from "@/components/app/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { transferPresidency } from "./actions";

export function TransferForm({ comunidadId, candidates }: { comunidadId: string; candidates: { id: string; label: string }[] }) {
  const [state, action] = useActionState(transferPresidency, {});
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="comunidadId" value={comunidadId} />
      <Field label="Nuevo presidente" htmlFor="memberId">
        <NativeSelect id="memberId" name="memberId" defaultValue="" required>
          <option value="" disabled>Seleccionar vecino…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </NativeSelect>
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Motivo</legend>
        {[["ROTACION", "Rotación anual (junta)"], ["DIMISION", "Dimisión voluntaria"], ["VENTA", "Cambio de propiedad"]].map(([v, l], i) => (
          <label key={v} className="flex items-center gap-2 text-sm">
            <input type="radio" name="reason" value={v} defaultChecked={i === 0} className="accent-primary" /> {l}
          </label>
        ))}
      </fieldset>
      <Alert>
        <AlertDescription>
          Al confirmar, el vecino elegido será presidente y tú pasarás a ser vecino. Ambos recibiréis una notificación.
        </AlertDescription>
      </Alert>
      <SubmitButton variant="destructive">Confirmar transferencia</SubmitButton>
    </form>
  );
}
