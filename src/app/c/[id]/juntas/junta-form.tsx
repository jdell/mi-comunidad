"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Field, FormError, SubmitButton } from "@/components/app/form";
import { NativeSelect } from "@/components/app/native-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LEGAL_MIN_NOTICE_DAYS_ORDINARIA, MAJORITY_LABELS, RECOMMENDED_NOTICE_DAYS, type Majority } from "@/lib/lph";
import { saveJunta } from "./actions";

export interface AgendaDraft {
  title: string;
  description: string;
  majority: Majority;
}

const DEFAULT_ORDINARIA: AgendaDraft[] = [
  { title: "Lectura y aprobación, si procede, del acta de la junta anterior", description: "", majority: "SIMPLE" },
  { title: "Aprobación del estado de cuentas del ejercicio", description: "", majority: "SIMPLE" },
  { title: "Aprobación del presupuesto para el próximo ejercicio y cuotas", description: "", majority: "SIMPLE" },
  { title: "Nombramiento o renovación de cargos", description: "", majority: "SIMPLE" },
  { title: "Ruegos y preguntas", description: "", majority: "INFORMATIVE" },
];

const DEFAULT_EXTRAORDINARIA: AgendaDraft[] = [
  { title: "", description: "", majority: "SIMPLE" },
  { title: "Ruegos y preguntas", description: "", majority: "INFORMATIVE" },
];

export function JuntaForm({
  comunidadId,
  junta,
}: {
  comunidadId: string;
  junta?: {
    id: string;
    type: "ORDINARIA" | "EXTRAORDINARIA";
    scheduledAtLocal: string;
    secondCallMinutes: number;
    location: string;
    notes: string;
    agenda: AgendaDraft[];
  };
}) {
  const [state, action] = useActionState(saveJunta, {});
  const e = state.fieldErrors ?? {};
  const [type, setType] = useState<"ORDINARIA" | "EXTRAORDINARIA">(junta?.type ?? "ORDINARIA");
  const [when, setWhen] = useState(junta?.scheduledAtLocal ?? "");
  const [agenda, setAgenda] = useState<AgendaDraft[]>(junta?.agenda ?? DEFAULT_ORDINARIA);
  const [touchedAgenda, setTouchedAgenda] = useState(Boolean(junta));

  const [now] = useState(() => Date.now());
  const days = useMemo(() => (when ? (new Date(when).getTime() - now) / 86_400_000 : null), [when, now]);
  const limitDate = useMemo(() => {
    if (!when) return null;
    const d = new Date(new Date(when).getTime() - RECOMMENDED_NOTICE_DAYS * 86_400_000);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  }, [when]);

  function update(i: number, patch: Partial<AgendaDraft>) {
    setTouchedAgenda(true);
    setAgenda((a) => a.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }
  function move(i: number, dir: -1 | 1) {
    setTouchedAgenda(true);
    setAgenda((a) => {
      const next = [...a];
      const [item] = next.splice(i, 1);
      next.splice(i + dir, 0, item!);
      return next;
    });
  }

  return (
    <Card>
      <CardContent>
        <form action={action} className="space-y-6">
          <FormError state={state} />
          <input type="hidden" name="comunidadId" value={comunidadId} />
          {junta && <input type="hidden" name="juntaId" value={junta.id} />}
          <input type="hidden" name="agenda" value={JSON.stringify(agenda)} />

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Tipo de junta</legend>
            <div className="flex gap-6">
              {(["ORDINARIA", "EXTRAORDINARIA"] as const).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="type"
                    value={t}
                    checked={type === t}
                    onChange={() => {
                      setType(t);
                      if (!touchedAgenda) setAgenda(t === "ORDINARIA" ? DEFAULT_ORDINARIA : DEFAULT_EXTRAORDINARIA);
                    }}
                    className="accent-primary"
                  />
                  {t === "ORDINARIA" ? "Ordinaria" : "Extraordinaria"}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label="Fecha y hora (primera convocatoria)" htmlFor="scheduledAt" error={e.scheduledAt}>
              <Input id="scheduledAt" name="scheduledAt" type="datetime-local" value={when} onChange={(ev) => setWhen(ev.target.value)} required />
            </Field>
            <Field label="Segunda convocatoria" htmlFor="secondCallMinutes" hint="Minutos después de la primera">
              <NativeSelect id="secondCallMinutes" name="secondCallMinutes" defaultValue={String(junta?.secondCallMinutes ?? 30)}>
                <option value="30">30 minutos después</option>
                <option value="60">1 hora después</option>
                <option value="0">Sin segunda convocatoria</option>
              </NativeSelect>
            </Field>
          </div>
          {days !== null && (
            type === "ORDINARIA" && days < LEGAL_MIN_NOTICE_DAYS_ORDINARIA ? (
              <Alert variant="destructive">
                <AlertDescription>
                  La LPH (art. 16.3) exige convocar la junta ordinaria con al menos {LEGAL_MIN_NOTICE_DAYS_ORDINARIA} días de antelación.
                </AlertDescription>
              </Alert>
            ) : days < RECOMMENDED_NOTICE_DAYS ? (
              <Alert className="border-warning">
                <AlertDescription>
                  Aviso: recomendamos enviar la convocatoria con {RECOMMENDED_NOTICE_DAYS} días de antelación (antes del {limitDate}) para que llegue a todos los vecinos.
                </AlertDescription>
              </Alert>
            ) : null
          )}

          <Field label="Lugar" htmlFor="location" error={e.location}>
            <Input id="location" name="location" defaultValue={junta?.location} placeholder="Portal del edificio / Salón de actos, planta baja" required />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Orden del día</p>
              {e.agenda && <p className="text-sm text-destructive">{e.agenda[0]}</p>}
            </div>
            {agenda.map((item, i) => (
              <div key={i} className="space-y-2 rounded-xl border p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 w-6 shrink-0 text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                  <Input value={item.title} onChange={(ev) => update(i, { title: ev.target.value })} placeholder="Obras de impermeabilización de la terraza" aria-label={`Punto ${i + 1}`} required />
                  <div className="flex shrink-0">
                    <Button type="button" size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir">
                      <ArrowUp />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" disabled={i === agenda.length - 1} onClick={() => move(i, 1)} aria-label="Bajar">
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setTouchedAgenda(true);
                        setAgenda((a) => a.filter((_, idx) => idx !== i));
                      }}
                      aria-label="Eliminar punto"
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 pl-8 sm:grid-cols-[1fr_240px]">
                  <Textarea rows={1} value={item.description} onChange={(ev) => update(i, { description: ev.target.value })} placeholder="Detalle (opcional)" aria-label="Detalle" />
                  <NativeSelect value={item.majority} onChange={(ev) => update(i, { majority: ev.target.value as Majority })} aria-label="Mayoría necesaria">
                    {Object.entries(MAJORITY_LABELS).map(([value, { label }]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </NativeSelect>
                </div>
                <p className="pl-8 text-xs text-muted-foreground">{MAJORITY_LABELS[item.majority].help}</p>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setTouchedAgenda(true);
                setAgenda((a) => [...a, { title: "", description: "", majority: "SIMPLE" }]);
              }}
            >
              <Plus /> Añadir punto
            </Button>
          </div>

          <Field label="Notas para los vecinos (opcional)" htmlFor="notes">
            <Textarea id="notes" name="notes" rows={3} defaultValue={junta?.notes} placeholder="Se ruega puntualidad. La documentación está disponible en Documentos." />
          </Field>

          <SubmitButton className="h-11">{junta ? "Guardar borrador" : "Crear borrador"}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
