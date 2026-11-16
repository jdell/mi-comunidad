import "server-only";
import { escapeHtml } from "@/lib/email";
import { COURTESY_PLAN } from "@/lib/entitlements";
import { formatDate } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { sendToPresidents } from "@/lib/retention";
import { appUrl } from "@/lib/urls";

/**
 * Tells the comunidad's presidents that a courtesy Pro grant was activated or extended.
 * Never throws (sendEmail is best-effort); returns how many emails were sent.
 */
export async function sendCourtesyGrantEmail(
  c: { id: string; name: string; unitsCount: number },
  until: Date,
  opts: { extended: boolean },
) {
  const plan = PLANS[COURTESY_PLAN];
  const gratisLimit = PLANS.GRATIS.maxUnits ?? 0;
  const date = formatDate(until);
  const afterwards =
    c.unitsCount > gratisLimit
      ? `Si no te suscribes antes, la comunidad volverá al plan Gratis y, al tener ${c.unitsCount} viviendas (el plan Gratis admite ${gratisLimit}), quedará en <strong>modo solo lectura</strong>. No se pierde ningún dato.`
      : "Si no te suscribes antes, la comunidad volverá al plan Gratis. No se pierde ningún dato: anuncios, documentos, actas y cuotas seguirán ahí.";

  try {
    return await sendToPresidents(c.id, "courtesy_grant", false, (name) => ({
      subject: opts.extended
        ? `Ampliamos ${plan.name} gratis para ${c.name} hasta el ${date}`
        : `${c.name} tiene ${plan.name} gratis hasta el ${date}`,
      title: opts.extended ? `${name}, ampliamos tu acceso a ${plan.name}` : `${name}, te regalamos ${plan.name}`,
      body: `<p>${
        opts.extended
          ? `Hemos ampliado el acceso de cortesía al plan <strong>${escapeHtml(plan.name)}</strong> de <strong>${escapeHtml(c.name)}</strong>.`
          : `El equipo de Mi Comunidad ha activado el plan <strong>${escapeHtml(plan.name)}</strong> de cortesía para <strong>${escapeHtml(c.name)}</strong>.`
      } Sin tarjeta y sin ningún compromiso.</p>
<p>Hasta el <strong>${date}</strong> la junta de gobierno y los vecinos podéis usar:</p>
<ul>
<li>Gestión de cuotas con recordatorios automáticos a los propietarios.</li>
<li>Votaciones en junta con cómputo por coeficientes y mayorías de la LPH.</li>
<li>Actas generadas automáticamente al cerrar la junta.</li>
<li>Calculadora de derramas por coeficiente de participación.</li>
<li>Analíticas de la comunidad y marca personalizada.</li>
<li>Hasta ${plan.maxUnits} viviendas y ${plan.storageGb} GB de documentos.</li>
</ul>
<p>${afterwards}</p>
<p>Para seguir con todas las funciones después del ${date}, suscríbete cuando quieras desde la sección Plan: el acceso de cortesía se sustituye por tu suscripción sin interrupciones.</p>`,
      cta: { label: "Ver planes y suscribirme", href: appUrl(`/c/${c.id}/plan`) },
    }));
  } catch (err) {
    console.error("[courtesy] email failed", err);
    return 0;
  }
}
