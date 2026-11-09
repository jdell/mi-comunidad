"use client";

import { useActionState, useMemo, useState } from "react";
import { Field, FormError, SubmitButton, useActionToast } from "@/components/app/form";
import { Input } from "@/components/ui/input";
import { monthlyCuotas } from "@/lib/cuotas";
import { formatCents, parseEurosToCents } from "@/lib/format";
import { saveCuotaConfig } from "../actions";

export function CuotaConfigForm({
  comunidadId,
  config,
  units,
}: {
  comunidadId: string;
  config: { cuotaMode: "FIXED" | "COEFFICIENT"; cuotaFixedCents: number; cuotaAnnualBudgetCents: number; cuotaDueDay: number };
  units: { id: string; label: string; coefficient: number }[];
}) {
  const [state, action] = useActionState(saveCuotaConfig, {});
  useActionToast(state);
  const [mode, setMode] = useState(config.cuotaMode);
  const [fixed, setFixed] = useState((config.cuotaFixedCents / 100).toFixed(2).replace(".", ","));
  const [budget, setBudget] = useState((config.cuotaAnnualBudgetCents / 100).toFixed(2).replace(".", ","));

  const preview = useMemo(
    () =>
      monthlyCuotas(
        { cuotaMode: mode, cuotaFixedCents: parseEurosToCents(fixed) ?? 0, cuotaAnnualBudgetCents: parseEurosToCents(budget) ?? 0 },
        units,
      ),
    [mode, fixed, budget, units],
  );
  const monthlyTotal = preview.reduce((a, u) => a + u.shareCents, 0);

  return (
    <form action={action} className="space-y-5">
      <FormError state={state} />
      <input type="hidden" name="comunidadId" value={comunidadId} />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">¿Cómo se calcula la cuota mensual?</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="cuotaMode" value="FIXED" checked={mode === "FIXED"} onChange={() => setMode("FIXED")} className="accent-primary" />
          Importe fijo igual para todas las viviendas
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="cuotaMode" value="COEFFICIENT" checked={mode === "COEFFICIENT"} onChange={() => setMode("COEFFICIENT")} className="accent-primary" />
          Presupuesto anual repartido por coeficiente (LPH art. 9.1.e)
        </label>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Cuota fija mensual (€)" htmlFor="cuotaFixed">
          <Input id="cuotaFixed" name="cuotaFixed" inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value)} disabled={mode !== "FIXED"} />
        </Field>
        <Field label="Presupuesto anual (€)" htmlFor="cuotaAnnualBudget">
          <Input id="cuotaAnnualBudget" name="cuotaAnnualBudget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} disabled={mode !== "COEFFICIENT"} />
        </Field>
        <Field label="Día de vencimiento" htmlFor="cuotaDueDay">
          <Input id="cuotaDueDay" name="cuotaDueDay" type="number" min={1} max={28} defaultValue={config.cuotaDueDay} />
        </Field>
      </div>
      {mode !== "FIXED" && <input type="hidden" name="cuotaFixed" value={fixed} />}
      {mode !== "COEFFICIENT" && <input type="hidden" name="cuotaAnnualBudget" value={budget} />}

      <div className="rounded-xl border">
        <p className="border-b px-4 py-2 text-sm font-medium">Vista previa: {formatCents(monthlyTotal)} al mes en total</p>
        <div className="grid max-h-64 grid-cols-2 gap-x-6 overflow-y-auto px-4 py-2 text-sm sm:grid-cols-3">
          {preview.map((u) => (
            <div key={u.id} className="flex justify-between py-1">
              <span className="font-mono">{u.label}</span>
              <span>{formatCents(u.shareCents)}</span>
            </div>
          ))}
        </div>
      </div>
      <SubmitButton>Guardar configuración</SubmitButton>
    </form>
  );
}
