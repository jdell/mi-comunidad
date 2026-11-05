"use client";

import { useActionState } from "react";
import { Save, Trash2 } from "lucide-react";
import { SubmitButton, useActionToast } from "@/components/app/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteUnit, saveUnit } from "./actions";

export function UnitRow({
  comunidadId,
  unit,
  occupant,
  editable,
}: {
  comunidadId: string;
  unit?: { id: string; label: string; floor: string | null; door: string | null; coefficient: string };
  occupant?: string | null;
  editable: boolean;
}) {
  const [state, action] = useActionState(saveUnit, {});
  useActionToast(state);

  if (!editable && unit) {
    return (
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 py-2 text-sm">
        <span className="font-medium">{unit.label}</span>
        <span>{unit.floor ?? "—"}</span>
        <span>{unit.door ?? "—"}</span>
        <span className="text-right font-mono">{unit.coefficient.replace(".", ",")} %</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center">
      <form action={action} key={unit ? `${unit.id}-${unit.coefficient}-${unit.label}-${unit.floor}-${unit.door}` : "new"} className="grid flex-1 grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr_auto] items-center gap-2">
        <input type="hidden" name="comunidadId" value={comunidadId} />
        {unit && <input type="hidden" name="unitId" value={unit.id} />}
        <Input name="label" defaultValue={unit?.label} placeholder="1ºA" aria-label="Vivienda" required />
        <Input name="floor" defaultValue={unit?.floor ?? ""} placeholder="Planta" aria-label="Planta" />
        <Input name="door" defaultValue={unit?.door ?? ""} placeholder="Puerta" aria-label="Puerta" />
        <Input name="coefficient" defaultValue={unit?.coefficient.replace(".", ",") ?? ""} placeholder="5,5000" inputMode="decimal" aria-label="Coeficiente (%)" required />
        <SubmitButton size="icon" variant={unit ? "ghost" : "default"}>
          <Save />
        </SubmitButton>
      </form>
      {unit && (
        <div className="flex items-center justify-between gap-2 sm:w-44">
          <span className="truncate text-xs text-muted-foreground">{occupant ?? "Sin vecino"}</span>
          {!occupant && (
            <form action={deleteUnit}>
              <input type="hidden" name="comunidadId" value={comunidadId} />
              <input type="hidden" name="unitId" value={unit.id} />
              <Button size="icon" variant="ghost" aria-label={`Eliminar ${unit.label}`}>
                <Trash2 className="text-destructive" />
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
