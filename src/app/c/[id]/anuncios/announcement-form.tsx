"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/app/form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveAnnouncement } from "./actions";

export interface AnnouncementDefaults {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  urgent: boolean;
  notifyEmail: boolean;
  imageUrl: string | null;
}

export function AnnouncementForm({ comunidadId, announcement }: { comunidadId: string; announcement?: AnnouncementDefaults }) {
  const [state, action] = useActionState(saveAnnouncement, {});
  const e = state.fieldErrors ?? {};
  const editing = Boolean(announcement);

  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-5">
          <FormError state={state} />
          <input type="hidden" name="comunidadId" value={comunidadId} />
          {announcement && <input type="hidden" name="announcementId" value={announcement.id} />}
          <Field label="Título" htmlFor="title" error={e.title}>
            <Input id="title" name="title" defaultValue={announcement?.title} placeholder="Corte de agua mañana" required />
          </Field>
          <Field label="Mensaje" htmlFor="body" error={e.body}>
            <Textarea
              id="body"
              name="body"
              rows={7}
              defaultValue={announcement?.body}
              placeholder="La empresa de fontanería realizará trabajos en la acometida general mañana de 9:00 a 14:00."
              required
            />
          </Field>
          <Field label="Foto (opcional)" htmlFor="image" hint="JPG, PNG o WebP. Máximo 5 MB.">
            {announcement?.imageUrl && (
              <div className="mb-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={announcement.imageUrl} alt="" className="h-20 w-28 rounded-lg object-cover" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="removeImage" className="accent-primary" /> Quitar foto
                </label>
              </div>
            )}
            <Input id="image" name="image" type="file" accept="image/*" capture="environment" />
          </Field>
          <fieldset className="space-y-3 rounded-xl border p-4">
            <legend className="px-1 text-sm font-medium">Opciones</legend>
            {!editing && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notifyEmail" defaultChecked className="accent-primary" />
                Notificar por email a todos los vecinos
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="pinned" defaultChecked={announcement?.pinned} className="accent-primary" />
              Fijar arriba del tablón
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="urgent" defaultChecked={announcement?.urgent} className="accent-primary" />
              Marcar como urgente
            </label>
          </fieldset>
          <SubmitButton className="h-11 w-full sm:w-auto" pendingLabel={editing ? "Guardando…" : "Publicando…"}>
            {editing ? "Guardar cambios" : "Publicar anuncio"}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
