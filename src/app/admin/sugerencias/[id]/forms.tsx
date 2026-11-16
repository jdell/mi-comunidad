"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { Textarea } from "@/components/ui/textarea";
import type { IdeaStatus } from "@/generated/prisma/enums";
import { IDEA_STATUS, IDEA_STATUSES } from "@/lib/ideas";
import { mergeIdea, updateIdea } from "../actions";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function IdeaAdminForm({ idea }: { idea: { id: string; status: IdeaStatus; response: string | null; adminNote: string | null } }) {
  const [state, action] = useActionState(updateIdea, {});
  useActionToast(state);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="ideaId" value={idea.id} />
      <Field label="Estado" htmlFor="status">
        <select id="status" name="status" defaultValue={idea.status} className={selectClass}>
          {IDEA_STATUSES.map((s) => (
            <option key={s} value={s}>{IDEA_STATUS[s].label} — {IDEA_STATUS[s].description}</option>
          ))}
        </select>
      </Field>
      <Field label="Respuesta pública" htmlFor="response" hint="Se muestra en el tablero de sugerencias.">
        <Textarea id="response" name="response" rows={3} maxLength={1000} defaultValue={idea.response ?? ""} />
      </Field>
      <Field label="Notas internas" htmlFor="adminNote" hint="Solo visibles para el equipo.">
        <Textarea id="adminNote" name="adminNote" rows={4} maxLength={4000} defaultValue={idea.adminNote ?? ""} />
      </Field>
      <SubmitButton pendingLabel="Guardando…">Guardar</SubmitButton>
    </form>
  );
}

export function MergeForm({ ideaId, targets }: { ideaId: string; targets: { id: string; title: string; votes: number }[] }) {
  const [state, action] = useActionState(mergeIdea, {});
  useActionToast(state);
  return (
    <form
      action={action}
      className="space-y-3"
      onSubmit={(ev) => {
        if (!confirm("¿Fusionar esta sugerencia? Sus votos pasarán a la de destino y dejará de mostrarse en el tablero.")) ev.preventDefault();
      }}
    >
      <FormError state={state} />
      <input type="hidden" name="ideaId" value={ideaId} />
      <Field label="Fusionar con" htmlFor="targetId">
        <select id="targetId" name="targetId" defaultValue="" className={selectClass} required>
          <option value="" disabled>Elige la sugerencia principal…</option>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>{t.title} ({t.votes})</option>
          ))}
        </select>
      </Field>
      <SubmitButton variant="outline" pendingLabel="Fusionando…">Fusionar duplicado</SubmitButton>
    </form>
  );
}
