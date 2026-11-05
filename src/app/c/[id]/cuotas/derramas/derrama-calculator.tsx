"use client";

import { useActionState, useMemo, useState } from "react";
import { Field, FormError, SubmitButton } from "@/components/app/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { splitByCoefficient, splitInstallments } from "@/lib/cuotas";
import { formatCents, parseEurosToCents } from "@/lib/format";
import { createDerrama } from "../actions";

export function DerramaCalculator({
  comunidadId,
  units,
  defaultPeriod,
}: {
  comunidadId: string;
  units: { id: string; label: string; coefficient: number; owner: string | null }[];
  defaultPeriod: string;
}) {
  const [state, action] = useActionState(createDerrama, {});
  const e = state.fieldErrors ?? {};
  const [total, setTotal] = useState("");
  const [installments, setInstallments] = useState(1);

  const totalCents = parseEurosToCents(total) ?? 0;
  const shares = useMemo(() => splitByCoefficient(totalCents, units), [totalCents, units]);
  const coefSum = units.reduce((a, u) => a + u.coefficient, 0);

  return (
    <form action={action} className="space-y-5">
      <FormError state={state} />
      <input type="hidden" name="comunidadId" value={comunidadId} />
      <Field label="Concepto" htmlFor="title" error={e.title}>
        <Input id="title" name="title" placeholder="Impermeabilización de la terraza" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Importe total (€)" htmlFor="total" error={e.total}>
          <Input id="total" name="total" inputMode="decimal" placeholder="12.000" value={total} onChange={(ev) => setTotal(ev.target.value)} required />
        </Field>
        <Field label="Número de plazos" htmlFor="installments" error={e.installments}>
          <Input id="installments" name="installments" type="number" min={1} max={36} value={installments} onChange={(ev) => setInstallments(Math.max(1, Math.min(36, Number(ev.target.value) || 1)))} />
        </Field>
        <Field label="Primer mes de pago" htmlFor="firstPeriod" error={e.firstPeriod}>
          <Input id="firstPeriod" name="firstPeriod" type="month" defaultValue={defaultPeriod} required />
        </Field>
      </div>
      <Field label="Descripción (opcional)" htmlFor="description">
        <Textarea id="description" name="description" rows={2} placeholder="Aprobada en junta extraordinaria del 15 de junio." />
      </Field>

      <div className="rounded-xl border">
        <div className="flex items-center justify-between border-b px-4 py-2 text-sm">
          <span className="font-medium">Reparto por coeficiente</span>
          <span className="text-muted-foreground">Suma coeficientes: {coefSum.toFixed(4).replace(".", ",")} %</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Vivienda</th>
                <th className="px-4 py-2 text-right">Coef.</th>
                <th className="px-4 py-2 text-right">Total</th>
                {installments > 1 && <th className="px-4 py-2 text-right">Por plazo</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {shares.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-1.5"><span className="font-mono">{s.label}</span> <span className="text-muted-foreground">{s.owner}</span></td>
                  <td className="px-4 py-1.5 text-right font-mono">{s.coefficient.toFixed(4).replace(".", ",")}</td>
                  <td className="px-4 py-1.5 text-right">{formatCents(s.shareCents)}</td>
                  {installments > 1 && <td className="px-4 py-1.5 text-right">{formatCents(splitInstallments(s.shareCents, installments)[0]!)}</td>}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t font-medium">
              <tr>
                <td className="px-4 py-2">Total</td>
                <td />
                <td className="px-4 py-2 text-right">{formatCents(shares.reduce((a, s) => a + s.shareCents, 0))}</td>
                {installments > 1 && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      <SubmitButton disabled={totalCents <= 0}>Aprobar derrama y generar cobros</SubmitButton>
    </form>
  );
}
