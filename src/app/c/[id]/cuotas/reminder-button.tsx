"use client";

import { useActionState } from "react";
import { Bell } from "lucide-react";
import { SubmitButton, useActionToast } from "@/components/app/form";
import { sendReminders } from "./actions";

export function ReminderButton({ comunidadId, disabled }: { comunidadId: string; disabled?: boolean }) {
  const [state, action] = useActionState(sendReminders, {});
  useActionToast(state);
  return (
    <form action={action}>
      <input type="hidden" name="comunidadId" value={comunidadId} />
      {disabled ? null : (
        <SubmitButton pendingLabel="Enviando…">
          <Bell /> Enviar recordatorio a morosos
        </SubmitButton>
      )}
    </form>
  );
}
