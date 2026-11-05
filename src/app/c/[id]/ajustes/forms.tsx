"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { NativeSelect } from "@/components/app/native-select";
import { Input } from "@/components/ui/input";
import { updateComunidad, updateMyProfile } from "./actions";

export function ProfileForm({
  comunidadId,
  member,
  units,
}: {
  comunidadId: string;
  member: { displayName: string; phone: string | null; email: string | null; unitId: string | null; notifyEmail: boolean };
  units: { id: string; label: string }[];
}) {
  const [state, action] = useActionState(updateMyProfile, {});
  useActionToast(state);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="comunidadId" value={comunidadId} />
      <Field label="Nombre visible" htmlFor="displayName" error={e.displayName}>
        <Input id="displayName" name="displayName" defaultValue={member.displayName} required />
      </Field>
      <Field label="Mi vivienda" htmlFor="unitId">
        <NativeSelect id="unitId" name="unitId" defaultValue={member.unitId ?? ""}>
          <option value="">Sin asignar</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.label}</option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono de contacto" htmlFor="phone" error={e.phone} hint="Para avisos por WhatsApp/SMS.">
          <Input id="phone" name="phone" type="tel" defaultValue={member.phone ?? ""} />
        </Field>
        <Field label="Email de contacto" htmlFor="email" error={e.email} hint="Para avisos por email.">
          <Input id="email" name="email" type="email" defaultValue={member.email ?? ""} />
        </Field>
      </div>
      <fieldset className="space-y-2 rounded-xl border p-4">
        <legend className="px-1 text-sm font-medium">Notificaciones</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="notifyEmail" defaultChecked={member.notifyEmail} className="accent-primary" />
          Recibir anuncios, incidencias y juntas por email
        </label>
      </fieldset>
      <SubmitButton>Guardar perfil</SubmitButton>
    </form>
  );
}

export function ComunidadForm({
  comunidad,
}: {
  comunidad: { id: string; name: string; address: string; city: string | null; postalCode: string | null; cif: string | null };
}) {
  const [state, action] = useActionState(updateComunidad, {});
  useActionToast(state);
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <input type="hidden" name="comunidadId" value={comunidad.id} />
      <Field label="Nombre" htmlFor="name" error={e.name}>
        <Input id="name" name="name" defaultValue={comunidad.name} required />
      </Field>
      <Field label="Dirección" htmlFor="address" error={e.address}>
        <Input id="address" name="address" defaultValue={comunidad.address} required />
      </Field>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Field label="Ciudad" htmlFor="city" error={e.city}>
          <Input id="city" name="city" defaultValue={comunidad.city ?? ""} />
        </Field>
        <Field label="C. postal" htmlFor="postalCode" error={e.postalCode}>
          <Input id="postalCode" name="postalCode" defaultValue={comunidad.postalCode ?? ""} />
        </Field>
      </div>
      <Field label="CIF" htmlFor="cif" error={e.cif}>
        <Input id="cif" name="cif" defaultValue={comunidad.cif ?? ""} className="uppercase" />
      </Field>
      <SubmitButton>Guardar datos</SubmitButton>
    </form>
  );
}
