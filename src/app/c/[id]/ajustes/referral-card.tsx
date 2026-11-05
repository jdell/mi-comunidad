import { Gift } from "lucide-react";
import { CopyButton, WhatsAppButton } from "@/components/app/copy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { computeEntitlements } from "@/lib/entitlements";
import { formatCents, formatDate } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { getOrCreateReferralCode, referralLink, referralRewardCents } from "@/lib/referrals";

/** President-only "Recomienda Mi Comunidad" section in Ajustes. */
export async function ReferralCard({ comunidadId }: { comunidadId: string }) {
  const code = await getOrCreateReferralCode(comunidadId);
  const link = referralLink(code);
  const [comunidad, referrals] = await Promise.all([
    db.comunidad.findUniqueOrThrow({ where: { id: comunidadId }, select: { plan: true, referralCreditPendingCents: true } }),
    db.comunidad.findMany({
      where: { referredById: comunidadId },
      select: { id: true, name: true, city: true, createdAt: true, plan: true, subscriptionStatus: true, trialEndsAt: true, unitsCount: true, referralConvertedAt: true, referralRewardCents: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const earned = referrals.reduce((a, r) => a + r.referralRewardCents, 0);
  const reward = referralRewardCents(comunidad);
  const shareText = `Hola, en nuestra comunidad usamos Mi Comunidad para los avisos, incidencias, juntas y cuotas, y nos ha simplificado mucho la vida. Podéis probarlo gratis 14 días: ${link}`;

  return (
    <Card id="recomienda" className="scroll-mt-20 border-primary/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="size-5 text-primary" /> Recomienda Mi Comunidad
        </CardTitle>
        <CardDescription>
          Por cada comunidad que se registre con vuestro enlace y contrate un plan, os regalamos un mes gratis ({formatCents(reward)}).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-lg bg-muted px-3 py-2 font-mono text-lg font-semibold tracking-widest">{code}</span>
          <CopyButton value={link} label="Copiar enlace" />
          <WhatsAppButton text={shareText} label="Compartir por WhatsApp" />
        </div>
        <p className="break-all text-sm text-muted-foreground">{link}</p>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-muted p-3"><p className="text-xl font-semibold">{referrals.length}</p><p className="text-xs text-muted-foreground">registradas</p></div>
          <div className="rounded-xl bg-muted p-3"><p className="text-xl font-semibold">{referrals.filter((r) => r.referralConvertedAt).length}</p><p className="text-xs text-muted-foreground">han contratado</p></div>
          <div className="rounded-xl bg-muted p-3"><p className="text-xl font-semibold">{formatCents(earned, { round: earned % 100 === 0 })}</p><p className="text-xs text-muted-foreground">ganado</p></div>
        </div>
        {comunidad.referralCreditPendingCents > 0 && (
          <p className="text-sm">Tenéis {formatCents(comunidad.referralCreditPendingCents)} de crédito que se aplicará al contratar un plan.</p>
        )}

        {referrals.length > 0 && (
          <div className="divide-y rounded-xl border">
            {referrals.map((r) => {
              const e = computeEntitlements(r);
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.city ? `${r.city} · ` : ""}registrada el {formatDate(r.createdAt)}</p>
                  </div>
                  {r.referralConvertedAt ? (
                    <Badge className="bg-success text-success-foreground">Contratado · +{formatCents(r.referralRewardCents)}</Badge>
                  ) : e.trialActive ? (
                    <Badge variant="secondary">En prueba</Badge>
                  ) : (
                    <Badge variant="outline">{PLANS[r.plan].name}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
