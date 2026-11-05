import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  Bell,
  CalendarDays,
  Check,
  FileText,
  MapPin,
  Pencil,
  Play,
  Radio,
  ScrollText,
  Send,
  Trash2,
  Vote as VoteIcon,
  X,
} from "lucide-react";
import { AutoRefresh } from "@/components/app/auto-refresh";
import { NativeSelect } from "@/components/app/native-select";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireMember } from "@/lib/auth";
import { formatCents, formatDateTime } from "@/lib/format";
import { computeJunta, JUNTA_STATUS_LABELS, JUNTA_TYPE_LABELS, loadJunta, morosoUnitIds, votableUnits } from "@/lib/juntas";
import { formatPct, MAJORITY_LABELS, RESULT_LABELS, type VoteTally } from "@/lib/lph";
import { isManager } from "@/lib/roles";
import { cn } from "@/lib/utils";
import {
  cancelJunta,
  castVote,
  closeJunta,
  deleteJunta,
  recordVotes,
  revokeProxy,
  rsvp,
  saveAttendance,
  sendConvocatoria,
  sendJuntaReminder,
  setResolution,
  setVoting,
  startJunta,
} from "../actions";
import { ProxyForm } from "./proxy-form";

export const metadata: Metadata = { title: "Junta" };

function Hidden({ comunidadId, juntaId, extra }: { comunidadId: string; juntaId: string; extra?: Record<string, string> }) {
  return (
    <>
      <input type="hidden" name="comunidadId" value={comunidadId} />
      <input type="hidden" name="juntaId" value={juntaId} />
      {Object.entries(extra ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

function TallyBar({ tally }: { tally: VoteTally }) {
  const total = tally.total.coefficient || 1;
  return (
    <div className="space-y-1">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="bg-success" style={{ width: `${(tally.yes.coefficient / total) * 100}%` }} />
        <div className="bg-destructive" style={{ width: `${(tally.no.coefficient / total) * 100}%` }} />
        <div className="bg-warning" style={{ width: `${(tally.abstain.coefficient / total) * 100}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        Sí {tally.yes.units} ({formatPct(tally.yes.coefficient)}) · No {tally.no.units} ({formatPct(tally.no.coefficient)}) · Abst. {tally.abstain.units} ({formatPct(tally.abstain.coefficient)})
      </p>
    </div>
  );
}

export default async function JuntaPage({ params, searchParams }: PageProps<"/c/[id]/juntas/[jid]">) {
  const { id, jid } = await params;
  const { error } = await searchParams;
  const { member } = await requireMember(id);
  const manager = isManager(member.role);
  const loaded = await loadJunta(id, jid);
  if (!loaded || (loaded.junta.status === "DRAFT" && !manager)) notFound();
  const { junta, units } = loaded;

  const morosos = await morosoUnitIds(id, junta.startedAt ?? new Date());
  const computed = computeJunta(loaded, morosos);
  const myVotable = votableUnits(loaded, member.id, member.unitId, morosos);
  const myRsvp = junta.rsvps.find((r) => r.memberId === member.id);
  const myProxy = junta.proxies.find((p) => p.fromMemberId === member.id);
  const received = junta.proxies.filter((p) => p.toMemberId === member.id);
  const unitLabel = new Map(units.map((u) => [u.id, u.label]));
  const live = junta.status === "EN_CURSO";
  const h = { comunidadId: id, juntaId: jid };
  const candidates = units
    .flatMap((u) => u.members.map((m) => ({ id: m.id, label: `${m.displayName} (${u.label})` })))
    .filter((c) => c.id !== member.id);

  return (
    <div className="mx-auto max-w-4xl">
      {live && <AutoRefresh />}
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href={`/c/${id}/juntas`}>
          <ArrowLeft /> Juntas
        </Link>
      </Button>
      <PageHeader
        title={`Junta ${JUNTA_TYPE_LABELS[junta.type].toLowerCase()}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge variant={live ? "default" : "secondary"}>
              {live && <Radio className="animate-pulse" />} {JUNTA_STATUS_LABELS[junta.status]}
            </Badge>
            <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" /> {formatDateTime(junta.scheduledAt)}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> {junta.location}</span>
          </span>
        }
        actions={
          <>
            {junta.status !== "DRAFT" && (
              <Button asChild variant="outline">
                <Link href={`/c/${id}/juntas/${jid}/convocatoria`}><FileText /> Convocatoria</Link>
              </Button>
            )}
            {junta.status === "CERRADA" && (
              <Button asChild>
                <Link href={`/c/${id}/juntas/${jid}/acta`}><ScrollText /> Acta</Link>
              </Button>
            )}
          </>
        }
      />

      {typeof error === "string" && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Manager controls by status ─────────────────────────────── */}
      {manager && junta.status === "DRAFT" && (
        <Card className="mb-4 border-primary/40">
          <CardHeader>
            <CardTitle>Borrador</CardTitle>
            <CardDescription>Revisa la convocatoria y envíala a todos los vecinos por email.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <form action={sendConvocatoria}>
              <Hidden {...h} />
              <Button><Send /> Enviar convocatoria</Button>
            </form>
            <Button asChild variant="outline">
              <Link href={`/c/${id}/juntas/${jid}/convocatoria`}><FileText /> Vista previa</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/c/${id}/juntas/${jid}/editar`}><Pencil /> Editar</Link>
            </Button>
            <form action={deleteJunta}>
              <Hidden {...h} />
              <Button variant="ghost"><Trash2 className="text-destructive" /> Eliminar</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {junta.status === "CONVOCADA" && (
        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>¿Vas a asistir?</CardTitle>
              <CardDescription>
                {junta.rsvps.filter((r) => r.attending).length} confirmados · {junta.proxies.length} votos delegados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={rsvp} className="flex gap-2">
                <Hidden {...h} />
                <Button name="attending" value="yes" variant={myRsvp?.attending ? "default" : "outline"}><Check /> Asistiré</Button>
                <Button name="attending" value="no" variant={myRsvp && !myRsvp.attending ? "default" : "outline"}><X /> No asistiré</Button>
              </form>
              {myProxy ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-muted p-3 text-sm">
                  <span>Has delegado tu voto en <strong>{myProxy.toMember.displayName}</strong>.</span>
                  <form action={revokeProxy}>
                    <Hidden {...h} />
                    <Button size="sm" variant="ghost">Revocar</Button>
                  </form>
                </div>
              ) : member.unitId ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Si no puedes ir, delega tu voto (LPH art. 15.1):</p>
                  <ProxyForm comunidadId={id} juntaId={jid} candidates={candidates} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Asigna tu vivienda en Ajustes para poder votar o delegar.</p>
              )}
              {received.length > 0 && (
                <p className="text-sm">Representas a: {received.map((p) => `${p.fromMember.displayName} (${unitLabel.get(p.unitId)})`).join(", ")}</p>
              )}
            </CardContent>
          </Card>
          {manager && (
            <Card>
              <CardHeader>
                <CardTitle>Gestión</CardTitle>
                <CardDescription>
                  Convocatoria enviada {junta.convocadaAt ? formatDateTime(junta.convocadaAt) : ""} a {junta.recipientsCount} vecinos.
                  {junta.reminderSentAt ? ` Recordatorio: ${formatDateTime(junta.reminderSentAt)}.` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <form action={startJunta} className="flex flex-wrap items-center gap-2">
                  <Hidden {...h} />
                  <NativeSelect name="call" defaultValue="first" className="w-auto" aria-label="Convocatoria">
                    <option value="first">Primera convocatoria</option>
                    {junta.secondCallAt && <option value="second">Segunda convocatoria</option>}
                  </NativeSelect>
                  <Button><Play /> Iniciar junta</Button>
                </form>
                <div className="flex flex-wrap gap-2">
                  <form action={sendJuntaReminder}>
                    <Hidden {...h} />
                    <Button variant="outline" size="sm"><Bell /> Enviar recordatorio</Button>
                  </form>
                  <form action={cancelJunta}>
                    <Hidden {...h} />
                    <Button variant="ghost" size="sm"><Ban className="text-destructive" /> Desconvocar</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {(live || junta.status === "CERRADA") && (
        <Card className="mb-4">
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Asistentes (presentes + representados)</p>
              <p className="text-2xl font-semibold">
                {computed.quorum.attending.units}/{computed.quorum.total.units}{" "}
                <span className="text-base font-normal text-muted-foreground">({formatPct(computed.quorum.attending.coefficient)})</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Quórum ({junta.heldOnSecondCall ? "segunda" : "primera"} convocatoria)</p>
              <Badge className={cn("mt-1", computed.quorum.reached ? "bg-success text-success-foreground" : "bg-destructive text-white")}>
                {computed.quorum.reached ? "Alcanzado" : "No alcanzado"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sin derecho a voto (art. 15.2)</p>
              <p className="text-sm">{morosos.size === 0 ? "Ninguno" : [...morosos.keys()].map((u) => unitLabel.get(u)).join(", ")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Agenda ─────────────────────────────────────────────────── */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Orden del día</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {computed.items.map(({ item, tally }) => {
            const votable = item.majority !== "INFORMATIVE";
            return (
              <div key={item.id} className="space-y-3 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.order}. {item.title}</p>
                    {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{MAJORITY_LABELS[item.majority].label}</p>
                  </div>
                  {item.votingOpen && <Badge><VoteIcon /> Votación abierta</Badge>}
                  {item.votingDone && item.result && (
                    <Badge className={cn(item.result === "APPROVED" && "bg-success text-success-foreground", item.result === "REJECTED" && "bg-destructive text-white", item.result === "PROVISIONAL" && "bg-warning text-warning-foreground")}>
                      {RESULT_LABELS[item.result]}
                    </Badge>
                  )}
                </div>

                {votable && (live || junta.status === "CERRADA") && (item.votes.length > 0 || item.votingOpen) && <TallyBar tally={tally} />}

                {/* Vecino voting */}
                {live && item.votingOpen && myVotable.length > 0 && (
                  <div className="space-y-2 rounded-xl bg-accent/40 p-3">
                    {myVotable.map((u) => {
                      const current = item.votes.find((v) => v.unitId === u.id)?.choice;
                      return (
                        <form key={u.id} action={castVote} className="flex flex-wrap items-center gap-2">
                          <Hidden {...h} extra={{ itemId: item.id, unitId: u.id }} />
                          <span className="w-24 text-sm font-medium">Voto {u.label}</span>
                          {(["YES", "NO", "ABSTAIN"] as const).map((c) => (
                            <Button key={c} name="choice" value={c} size="sm" variant={current === c ? "default" : "outline"}>
                              {c === "YES" ? "Sí" : c === "NO" ? "No" : "Abstención"}
                            </Button>
                          ))}
                        </form>
                      );
                    })}
                  </div>
                )}

                {/* Manager controls */}
                {manager && live && votable && (
                  <div className="space-y-3">
                    <form action={setVoting}>
                      <Hidden {...h} extra={{ itemId: item.id, open: String(!item.votingOpen) }} />
                      <Button size="sm" variant={item.votingOpen ? "default" : "outline"}>
                        {item.votingOpen ? "Cerrar votación y calcular resultado" : item.votingDone ? "Reabrir votación" : "Abrir votación"}
                      </Button>
                    </form>
                    {item.votingOpen && computed.presentIds.size > 0 && (
                      <details className="rounded-xl border p-3">
                        <summary className="cursor-pointer text-sm font-medium">Registrar votos en sala</summary>
                        <form action={recordVotes} className="mt-3 space-y-2">
                          <Hidden {...h} extra={{ itemId: item.id }} />
                          <div className="grid gap-2 sm:grid-cols-2">
                            {units
                              .filter((u) => computed.presentIds.has(u.id) && !morosos.has(u.id))
                              .map((u) => (
                                <label key={u.id} className="flex items-center gap-2 text-sm">
                                  <span className="w-16 font-mono">{u.label}</span>
                                  <NativeSelect name={`vote:${u.id}`} defaultValue={item.votes.find((v) => v.unitId === u.id)?.choice ?? ""} className="h-8">
                                    <option value="">—</option>
                                    <option value="YES">Sí</option>
                                    <option value="NO">No</option>
                                    <option value="ABSTAIN">Abstención</option>
                                  </NativeSelect>
                                </label>
                              ))}
                          </div>
                          <Button size="sm">Guardar votos</Button>
                        </form>
                      </details>
                    )}
                  </div>
                )}
                {manager && (live || junta.status === "CERRADA") && (
                  <form action={setResolution} className="flex flex-col gap-2 sm:flex-row">
                    <Hidden {...h} extra={{ itemId: item.id }} />
                    <Textarea name="resolution" rows={1} defaultValue={item.resolution ?? ""} placeholder="Acuerdo adoptado / resumen para el acta" aria-label="Acuerdo" />
                    <Button size="sm" variant="outline" className="sm:self-start">Guardar</Button>
                  </form>
                )}
                {!manager && item.resolution && <p className="text-sm"><strong>Acuerdo:</strong> {item.resolution}</p>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ── Attendance (manager, live) ─────────────────────────────── */}
      {manager && live && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Asistencia</CardTitle>
            <CardDescription>Los votos delegados y los vecinos que votan desde la app se registran automáticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={saveAttendance} className="space-y-3">
              <Hidden {...h} />
              <div className="divide-y">
                {units.map((u) => {
                  const att = junta.attendances.find((a) => a.unitId === u.id);
                  return (
                    <div key={u.id} className="grid grid-cols-[64px_1fr] items-center gap-2 py-2 sm:grid-cols-[64px_1fr_180px_1fr]">
                      <span className="font-mono text-sm">{u.label}</span>
                      <span className="truncate text-sm text-muted-foreground">
                        {u.members.map((m) => m.displayName).join(", ") || "—"} · {formatPct(u.coefficient.toNumber())}
                        {morosos.has(u.id) && <span className="text-destructive"> · moroso ({formatCents(morosos.get(u.id)!)})</span>}
                      </span>
                      <NativeSelect name={`att:${u.id}`} defaultValue={att?.type ?? "ABSENT"} className="h-8">
                        <option value="ABSENT">Ausente</option>
                        <option value="IN_PERSON">Presente</option>
                        <option value="REMOTE">Telemático</option>
                        <option value="PROXY">Representado</option>
                      </NativeSelect>
                      <Input name={`rep:${u.id}`} defaultValue={att?.representativeName ?? ""} placeholder="Representante" className="h-8" />
                    </div>
                  );
                })}
              </div>
              <Button>Guardar asistencia</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {manager && live && (
        <Alert>
          <AlertTitle>Cerrar la junta</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Se cerrarán las votaciones pendientes y se generará el acta con asistencia, votos y acuerdos.</p>
            <form action={closeJunta}>
              <Hidden {...h} />
              <Button>Cerrar junta y generar acta</Button>
            </form>
          </AlertDescription>
        </Alert>
      )}

      {junta.notes && junta.status !== "CERRADA" && (
        <Card>
          <CardContent className="whitespace-pre-line text-sm">{junta.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
