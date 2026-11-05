import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Check, ChevronLeft, ChevronRight, Clock, Settings2, Sigma } from "lucide-react";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireMember } from "@/lib/auth";
import { addMonths, CUOTA_STATUS_LABELS, displayStatus, isValidPeriod, periodLabel, periodOf, type CuotaDisplayStatus } from "@/lib/cuotas";
import { db } from "@/lib/db";
import { formatCents, formatDate } from "@/lib/format";
import { isFinance } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { generateCuotas, togglePaid } from "./actions";
import { ReminderButton } from "./reminder-button";

export const metadata: Metadata = { title: "Cuotas" };

const STATUS_STYLE: Record<CuotaDisplayStatus, string> = {
  PAID: "bg-success text-success-foreground",
  PENDING: "bg-muted text-muted-foreground",
  OVERDUE: "bg-destructive text-white",
};

function StatusIcon({ status }: { status: CuotaDisplayStatus }) {
  return status === "PAID" ? <Check className="size-3.5" /> : status === "OVERDUE" ? <AlertCircle className="size-3.5" /> : <Clock className="size-3.5" />;
}

export default async function CuotasPage({ params, searchParams }: PageProps<"/c/[id]/cuotas">) {
  const { id } = await params;
  const { mes } = await searchParams;
  const { member, comunidad } = await requireMember(id);
  const finance = isFinance(member.role);
  const now = new Date();

  // ── Vecino view: my unit's cuotas ──────────────────────────────────
  if (!finance) {
    const cuotas = member.unitId
      ? await db.cuota.findMany({ where: { comunidadId: id, unitId: member.unitId }, include: { derrama: true }, orderBy: { dueDate: "desc" }, take: 36 })
      : [];
    const owed = cuotas.filter((c) => c.status === "PENDING" && c.dueDate < now).reduce((a, c) => a + c.amountCents, 0);
    return (
      <>
        <PageHeader title="Mis cuotas" description={member.unit ? `Vivienda ${member.unit.label}` : undefined} />
        {!member.unitId ? (
          <Alert><AlertDescription>Asigna tu vivienda en Ajustes para ver tus cuotas.</AlertDescription></Alert>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3">
              <StatCard label="deuda vencida" value={formatCents(owed)} />
              <StatCard label="estado" value={owed > 0 ? "Pendiente" : "Al día ✓"} />
            </div>
            <Card>
              <CardContent className="divide-y">
                {cuotas.length === 0 && <p className="py-2 text-sm text-muted-foreground">Todavía no hay cuotas registradas.</p>}
                {cuotas.map((c) => {
                  const s = displayStatus(c, now);
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="font-medium">{c.kind === "DERRAMA" ? `${c.derrama?.title} (plazo ${c.installment})` : `Cuota ${periodLabel(c.period)}`}</p>
                        <p className="text-xs text-muted-foreground">Vence el {formatDate(c.dueDate)}{c.paidAt ? ` · pagada el ${formatDate(c.paidAt)}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{formatCents(c.amountCents)}</span>
                        <Badge className={STATUS_STYLE[s]}><StatusIcon status={s} /> {CUOTA_STATUS_LABELS[s]}</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </>
        )}
      </>
    );
  }

  // ── Finance view ───────────────────────────────────────────────────
  const period = typeof mes === "string" && isValidPeriod(mes) ? mes : periodOf(now);
  const periods = [period, addMonths(period, -1), addMonths(period, -2)];
  const [units, cuotas, overdueAgg] = await Promise.all([
    db.unit.findMany({
      where: { comunidadId: id },
      include: { members: { where: { status: "ACTIVE" }, select: { displayName: true }, take: 1 } },
      orderBy: [{ floor: "asc" }, { label: "asc" }],
    }),
    db.cuota.findMany({ where: { comunidadId: id, kind: "ORDINARIA", period: { in: periods } } }),
    db.cuota.findMany({ where: { comunidadId: id, status: "PENDING", dueDate: { lt: now } }, select: { unitId: true, amountCents: true } }),
  ]);
  const cell = new Map(cuotas.map((c) => [`${c.unitId}:${c.period}`, c]));
  const current = cuotas.filter((c) => c.period === period);
  const paidCount = current.filter((c) => c.status === "PAID").length;
  const totalDebt = overdueAgg.reduce((a, c) => a + c.amountCents, 0);
  const morosoUnits = new Set(overdueAgg.map((c) => c.unitId)).size;
  const configured = comunidad.cuotaMode === "FIXED" ? comunidad.cuotaFixedCents > 0 : comunidad.cuotaAnnualBudgetCents > 0;

  return (
    <>
      <PageHeader
        title="Cuotas"
        description="Quién ha pagado, quién no y cuánto se debe."
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/c/${id}/cuotas/derramas`}><Sigma /> Derramas</Link></Button>
            <Button asChild variant="outline"><Link href={`/c/${id}/cuotas/configuracion`}><Settings2 /> Configurar</Link></Button>
          </>
        }
      />
      {!configured && (
        <Alert className="mb-4 border-warning">
          <AlertDescription>
            Aún no has configurado el importe de las cuotas. <Link href={`/c/${id}/cuotas/configuracion`} className="font-medium underline">Configurar ahora</Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Mes anterior"><Link href={`?mes=${addMonths(period, -1)}`}><ChevronLeft /></Link></Button>
        <p className="font-heading text-lg font-semibold">{periodLabel(period)}</p>
        <Button asChild variant="ghost" size="icon" aria-label="Mes siguiente"><Link href={`?mes=${addMonths(period, 1)}`}><ChevronRight /></Link></Button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="al día este mes" value={`${paidCount}/${current.length || units.length}`} />
        <StatCard label="viviendas con deuda" value={morosoUnits} />
        <StatCard label="deuda vencida total" value={formatCents(totalDebt, { round: true })} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {configured && current.length < units.length && (
          <form action={generateCuotas}>
            <input type="hidden" name="comunidadId" value={id} />
            <input type="hidden" name="period" value={period} />
            <Button variant="secondary">Generar cuotas de {periodLabel(period, "long").toLowerCase()}</Button>
          </form>
        )}
        <ReminderButton comunidadId={id} disabled={morosoUnits === 0} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Toca una cuota para marcarla como pagada o pendiente</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Vivienda</th>
                {periods.map((p) => <th key={p} className="py-2 text-center">{periodLabel(p, "short")}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {units.map((u) => (
                <tr key={u.id}>
                  <td className="py-2">
                    <span className="font-mono font-medium">{u.label}</span>{" "}
                    <span className="text-muted-foreground">{u.members[0]?.displayName ?? ""}</span>
                  </td>
                  {periods.map((p) => {
                    const c = cell.get(`${u.id}:${p}`);
                    if (!c) return <td key={p} className="py-2 text-center text-muted-foreground">—</td>;
                    const s = displayStatus(c, now);
                    return (
                      <td key={p} className="py-2 text-center">
                        <form action={togglePaid}>
                          <input type="hidden" name="comunidadId" value={id} />
                          <input type="hidden" name="cuotaId" value={c.id} />
                          <button
                            className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[s])}
                            title={`${CUOTA_STATUS_LABELS[s]} · ${formatCents(c.amountCents)}`}
                          >
                            <StatusIcon status={s} /> {formatCents(c.amountCents, { round: c.amountCents % 100 === 0 })}
                          </button>
                        </form>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
