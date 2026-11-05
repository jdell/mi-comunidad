// Pricing tiers. Prices in EUR cents. `maxUnits: null` means unlimited.

export type PlanId = "GRATIS" | "COMUNIDAD" | "PRO" | "ADMINISTRADOR";

export type PlanFeature =
  | "announcements"
  | "incidencias"
  | "documents"
  | "junta_basic"
  | "cuotas"
  | "reminders"
  | "voting"
  | "actas"
  | "derramas"
  | "analytics"
  | "branding"
  | "multi_comunidad";

export interface Plan {
  id: PlanId;
  name: string;
  priceCents: number;
  maxUnits: number | null;
  storageGb: number;
  tagline: string;
  highlights: string[];
  features: PlanFeature[];
}

const BASE: PlanFeature[] = ["announcements", "incidencias", "documents", "junta_basic"];
const COMUNIDAD: PlanFeature[] = [...BASE, "cuotas", "reminders", "voting", "actas", "derramas"];
const PRO: PlanFeature[] = [...COMUNIDAD, "analytics", "branding"];

export const PLANS: Record<PlanId, Plan> = {
  GRATIS: {
    id: "GRATIS",
    name: "Gratis",
    priceCents: 0,
    maxUnits: 10,
    storageGb: 1,
    tagline: "Para comunidades pequeñas que empiezan",
    highlights: ["Hasta 10 viviendas", "Anuncios e incidencias", "Documentos (1 GB)", "Convocatoria básica de junta"],
    features: BASE,
  },
  COMUNIDAD: {
    id: "COMUNIDAD",
    name: "Comunidad",
    priceCents: 900,
    maxUnits: 50,
    storageGb: 10,
    tagline: "Todo lo que necesita un presidente",
    highlights: ["Hasta 50 viviendas", "Todo lo de Gratis", "Cuotas y recordatorios", "Votaciones y actas automáticas", "Calculadora de derramas", "Documentos (10 GB)"],
    features: COMUNIDAD,
  },
  PRO: {
    id: "PRO",
    name: "Comunidad Pro",
    priceCents: 1900,
    maxUnits: 200,
    storageGb: 50,
    tagline: "Para fincas grandes",
    highlights: ["Hasta 200 viviendas", "Todo lo de Comunidad", "Analíticas", "Marca personalizada", "Soporte prioritario"],
    features: PRO,
  },
  ADMINISTRADOR: {
    id: "ADMINISTRADOR",
    name: "Administrador",
    priceCents: 9900,
    maxUnits: null,
    storageGb: 200,
    tagline: "Para administradores de fincas",
    highlights: ["Comunidades y viviendas ilimitadas", "Todo lo de Pro", "Panel multi-comunidad", "Operaciones en bloque"],
    features: [...PRO, "multi_comunidad"],
  },
};

export const PLAN_ORDER: PlanId[] = ["GRATIS", "COMUNIDAD", "PRO", "ADMINISTRADOR"];

/** Cheapest plan that fits a number of units. */
export function planForUnits(units: number): PlanId {
  return PLAN_ORDER.find((id) => {
    const max = PLANS[id].maxUnits;
    return max === null || units <= max;
  })!;
}
