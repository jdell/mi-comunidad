"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/app/form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createComunidad, goToInvite } from "./actions";

export function CreateComunidadForm({ defaultName, referralCode }: { defaultName: string; referralCode: string | null }) {
  const [state, action] = useActionState(createComunidad, {});
  const e = state.fieldErrors ?? {};
  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-5">
          <FormError state={state} />
          {referralCode && <input type="hidden" name="ref" value={referralCode} />}
          <Field label="Nombre de la comunidad" htmlFor="name" error={e.name}>
            <Input id="name" name="name" placeholder="C. P. Gran Vía 42" required />
          </Field>
          <Field label="Dirección" htmlFor="address" error={e.address}>
            <Input id="address" name="address" placeholder="Calle Gran Vía 42" autoComplete="street-address" required />
          </Field>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Ciudad" htmlFor="city" error={e.city}>
              <Input id="city" name="city" placeholder="Madrid" autoComplete="address-level2" />
            </Field>
            <Field label="C. postal" htmlFor="postalCode" error={e.postalCode}>
              <Input id="postalCode" name="postalCode" inputMode="numeric" placeholder="28013" autoComplete="postal-code" />
            </Field>
          </div>
          <Field label="CIF (opcional)" htmlFor="cif" error={e.cif} hint="Las comunidades de propietarios tienen CIF que empieza por H.">
            <Input id="cif" name="cif" placeholder="H12345678" className="uppercase" />
          </Field>
          <Field label="Número de viviendas y locales" htmlFor="unitsCount" error={e.unitsCount}>
            <Input id="unitsCount" name="unitsCount" type="number" min={1} max={2000} placeholder="18" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plantas (opcional)" htmlFor="floors" error={e.floors}>
              <Input id="floors" name="floors" type="number" min={1} max={60} placeholder="6" />
            </Field>
            <Field label="Puertas por planta" htmlFor="doorsPerFloor" error={e.doorsPerFloor}>
              <Input id="doorsPerFloor" name="doorsPerFloor" type="number" min={1} max={26} placeholder="3" />
            </Field>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">
            Si indicas plantas y puertas generamos las viviendas como 1ºA, 1ºB… Podrás editarlas y ajustar los
            coeficientes después.
          </p>
          <Field label="Tu nombre" htmlFor="presidentName" error={e.presidentName}>
            <Input id="presidentName" name="presidentName" defaultValue={defaultName} autoComplete="name" required />
          </Field>
          <SubmitButton className="h-11 w-full" pendingLabel="Creando comunidad…">
            Crear comunidad y ser presidente
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function JoinWithCodeForm() {
  const [state, action] = useActionState(goToInvite, {});
  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-3">
          <FormError state={state} />
          <Field label="Código de invitación" htmlFor="code">
            <Input id="code" name="code" placeholder="ABCD2345" className="uppercase tracking-widest" required />
          </Field>
          <SubmitButton variant="secondary" className="w-full">
            Unirme
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
