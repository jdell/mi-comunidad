"use client";

import { useActionState } from "react";
import { SubmitButton, useActionToast } from "@/components/app/form";
import { COURTESY_DURATIONS, COURTESY_DURATION_KEYS, DEFAULT_COURTESY_DURATION } from "@/lib/courtesy-grant";
import { grantCourtesy, revokeCourtesy } from "./actions";

/** Admin controls for courtesy Pro: grant, or extend/revoke while active. */
export function CourtesyForm({ comunidadId, active, disabled }: { comunidadId: string; active: boolean; disabled?: boolean }) {
  const [grantState, grantAction] = useActionState(grantCourtesy, undefined);
  const [revokeState, revokeAction] = useActionState(revokeCourtesy, undefined);
  useActionToast(grantState);
  useActionToast(revokeState);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={grantAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="comunidadId" value={comunidadId} />
        <label htmlFor="courtesy-duration" className="sr-only">Duración</label>
        <select
          id="courtesy-duration"
          name="duration"
          defaultValue={DEFAULT_COURTESY_DURATION}
          disabled={disabled}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
        >
          {COURTESY_DURATION_KEYS.map((k) => (
            <option key={k} value={k}>{COURTESY_DURATIONS[k].label}</option>
          ))}
        </select>
        <SubmitButton size="sm" disabled={disabled} pendingLabel={active ? "Ampliando…" : "Concediendo…"}>
          {active ? "Ampliar" : "Conceder Pro"}
        </SubmitButton>
      </form>
      {active && (
        <form
          action={revokeAction}
          onSubmit={(ev) => {
            if (!confirm("¿Revocar la cortesía Pro ahora? La comunidad perderá las funciones Pro de inmediato.")) ev.preventDefault();
          }}
        >
          <input type="hidden" name="comunidadId" value={comunidadId} />
          <SubmitButton size="sm" variant="outline" pendingLabel="Revocando…">Revocar</SubmitButton>
        </form>
      )}
    </div>
  );
}
