"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { CopyButton, WhatsAppButton } from "@/components/app/copy-button";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createInvitation } from "./actions";

export function InviteDialog({
  comunidadId,
  unit,
  trigger,
}: {
  comunidadId: string;
  unit?: { id: string; label: string };
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createInvitation, {});
  useActionToast(state);
  const e = state.fieldErrors ?? {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <UserPlus /> Invitar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{unit ? `Invitar a la vivienda ${unit.label}` : "Invitación personal"}</DialogTitle>
          <DialogDescription>
            Genera un enlace personal. Si indicas un email, se lo enviamos directamente.
          </DialogDescription>
        </DialogHeader>
        {state.ok && state.data?.link ? (
          <div className="space-y-4">
            <div className="break-all rounded-lg bg-muted p-3 font-mono text-sm">{state.data.link}</div>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={state.data.link} />
              <WhatsAppButton text={state.data.text ?? state.data.link} label="Enviar por WhatsApp" />
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
              Cerrar
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <FormError state={state} />
            <input type="hidden" name="comunidadId" value={comunidadId} />
            {unit && <input type="hidden" name="unitId" value={unit.id} />}
            <Field label="Nombre (opcional)" htmlFor="inv-name" error={e.name}>
              <Input id="inv-name" name="name" placeholder="Laura Martínez" />
            </Field>
            <Field label="Email (opcional)" htmlFor="inv-email" error={e.email}>
              <Input id="inv-email" name="email" type="email" placeholder="laura@email.com" />
            </Field>
            <Field label="Teléfono (opcional)" htmlFor="inv-phone" error={e.phone}>
              <Input id="inv-phone" name="phone" type="tel" placeholder="612 345 678" />
            </Field>
            <SubmitButton className="w-full">Crear invitación</SubmitButton>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
