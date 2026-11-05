"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { Input } from "@/components/ui/input";
import { updateAccount } from "./actions";

export function AccountForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateAccount, {});
  useActionToast(state);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <Field label="Nombre" htmlFor="name" error={state.fieldErrors?.name}>
        <Input id="name" name="name" defaultValue={name} required />
      </Field>
      <SubmitButton>Guardar</SubmitButton>
    </form>
  );
}
