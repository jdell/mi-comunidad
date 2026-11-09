"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/app/form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/app/native-select";
import { joinComunidad } from "./actions";

export function JoinForm({
  code,
  defaultName,
  units,
  lockedUnitId,
  requiresApproval,
}: {
  code: string;
  defaultName: string;
  units: { id: string; label: string }[];
  lockedUnitId: string | null;
  requiresApproval: boolean;
}) {
  const [state, action] = useActionState(joinComunidad, {});
  const e = state.fieldErrors ?? {};
  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-4">
          <FormError state={state} />
          <input type="hidden" name="code" value={code} />
          <Field label="Tu nombre" htmlFor="displayName" error={e.displayName}>
            <Input id="displayName" name="displayName" defaultValue={defaultName} autoComplete="name" required />
          </Field>
          <Field
            label="Tu piso / local"
            htmlFor="unitId"
            error={e.unitId}
            hint={lockedUnitId ? undefined : "Solo aparecen las viviendas sin reclamar."}
          >
            <NativeSelect id="unitId" name="unitId" defaultValue={lockedUnitId ?? ""} disabled={!!lockedUnitId}>
              {!lockedUnitId && <option value="">Lo indicaré más tarde</option>}
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </NativeSelect>
            {lockedUnitId && <input type="hidden" name="unitId" value={lockedUnitId} />}
          </Field>
          <SubmitButton className="h-11 w-full">Unirme a la comunidad</SubmitButton>
          {requiresApproval && (
            <p className="text-center text-sm text-muted-foreground">
              El presidente tiene que aprobar tu solicitud antes de que puedas entrar.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
