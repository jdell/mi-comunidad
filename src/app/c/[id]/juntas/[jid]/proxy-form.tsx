"use client";

import { useActionState } from "react";
import { FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { NativeSelect } from "@/components/app/native-select";
import { delegateProxy } from "../actions";

export function ProxyForm({ comunidadId, juntaId, candidates }: { comunidadId: string; juntaId: string; candidates: { id: string; label: string }[] }) {
  const [state, action] = useActionState(delegateProxy, {});
  useActionToast(state);
  return (
    <form action={action} className="space-y-3">
      <FormError state={state} />
      <input type="hidden" name="comunidadId" value={comunidadId} />
      <input type="hidden" name="juntaId" value={juntaId} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <NativeSelect name="toMemberId" defaultValue="" required aria-label="Vecino en quien delegar">
          <option value="" disabled>Elegir vecino…</option>
          {candidates.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </NativeSelect>
        <SubmitButton variant="secondary">Delegar voto</SubmitButton>
      </div>
    </form>
  );
}
