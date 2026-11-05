import "server-only";
import { db } from "@/lib/db";
import { sumCoefficients } from "@/lib/units";

export interface OnboardingStep {
  key: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
}

/** First-steps checklist for a new president, computed from real data. */
export async function onboardingSteps(comunidadId: string): Promise<OnboardingStep[]> {
  const base = `/c/${comunidadId}`;
  const [comunidad, units, members, invitations, announcements, documents, juntas] = await Promise.all([
    db.comunidad.findUniqueOrThrow({ where: { id: comunidadId } }),
    db.unit.findMany({ where: { comunidadId }, select: { coefficient: true, updatedAt: true, createdAt: true } }),
    db.comunidadMember.count({ where: { comunidadId, status: "ACTIVE" } }),
    db.invitation.count({ where: { comunidadId } }),
    db.announcement.count({ where: { comunidadId } }),
    db.document.count({ where: { comunidadId } }),
    db.junta.count({ where: { comunidadId } }),
  ]);
  const coefOk = Math.abs(sumCoefficients(units) - 100) < 0.01;
  const unitsReviewed = units.some((u) => u.updatedAt.getTime() - u.createdAt.getTime() > 1000);
  const cuotasConfigured = comunidad.cuotaFixedCents > 0 || comunidad.cuotaAnnualBudgetCents > 0;

  return [
    { key: "units", label: "Revisa viviendas y coeficientes", hint: "Están en la escritura de división horizontal.", href: `${base}/unidades`, done: coefOk && unitsReviewed },
    { key: "invite", label: "Invita a tus vecinos", hint: "Comparte el enlace en el grupo de WhatsApp o imprime el QR.", href: `${base}/invitar`, done: members > 1 || invitations > 0 },
    { key: "announcement", label: "Publica tu primer anuncio", hint: "Por ejemplo, un mensaje de bienvenida.", href: `${base}/anuncios/nuevo`, done: announcements > 0 },
    { key: "documents", label: "Sube los estatutos o el seguro", hint: "Así todos los tendrán a mano.", href: `${base}/documentos`, done: documents > 0 },
    { key: "cuotas", label: "Configura las cuotas", hint: "Importe mensual y día de vencimiento.", href: `${base}/cuotas/configuracion`, done: cuotasConfigured },
    { key: "junta", label: "Prepara tu primera junta", hint: "Con convocatoria conforme a la LPH.", href: `${base}/juntas/nueva`, done: juntas > 0 },
  ];
}
