"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { Input } from "@/components/ui/input";
import { deleteAccount, updateAccount } from "./actions";

export function AccountForm({ name, productEmails }: { name: string; productEmails: boolean }) {
  const [state, action] = useActionState(updateAccount, {});
  useActionToast(state);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <Field label="Nombre" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="productEmails" defaultChecked={productEmails} className="mt-0.5 accent-primary" />
        <span>
          Recibir consejos y novedades de Mi Comunidad por email.
          <span className="block text-xs text-muted-foreground">Los avisos de tu comunidad se gestionan en Ajustes de cada comunidad.</span>
        </span>
      </label>
      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccount, {});
  return (
    <form action={action} className="space-y-3">
      <FormError state={state} />
      <Field label="Escribe ELIMINAR para confirmar" htmlFor="confirm">
        <Input id="confirm" name="confirm" autoComplete="off" className="uppercase" />
      </Field>
      <SubmitButton variant="destructive">Eliminar mi cuenta</SubmitButton>
    </form>
  );
}
