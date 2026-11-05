"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { NativeSelect } from "@/components/app/native-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DOCUMENT_CATEGORY } from "@/lib/labels";
import type { ActionState } from "@/lib/validation";
import { uploadDocument } from "./actions";

export function UploadDialog({ comunidadId }: { comunidadId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await uploadDocument(prev, formData);
    if (result.ok) setOpen(false);
    return result;
  }, {});
  useActionToast(state);
  const e = state.fieldErrors ?? {};
  const year = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload /> Subir documento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <FormError state={state} />
          <input type="hidden" name="comunidadId" value={comunidadId} />
          <Field label="Archivo" htmlFor="file" hint="PDF, Word, Excel o imagen. Máximo 10 MB.">
            <Input id="file" name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png" required />
          </Field>
          <Field label="Título" htmlFor="title" error={e.title}>
            <Input id="title" name="title" placeholder="Acta junta ordinaria junio" required />
          </Field>
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <Field label="Tipo" htmlFor="category" error={e.category}>
              <NativeSelect id="category" name="category" defaultValue="ACTA">
                {Object.entries(DOCUMENT_CATEGORY).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Año" htmlFor="year" error={e.year}>
              <Input id="year" name="year" type="number" defaultValue={year} min={1950} max={year + 1} required />
            </Field>
          </div>
          <SubmitButton className="w-full" pendingLabel="Subiendo…">Subir</SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
