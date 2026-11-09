import type {
  DocumentCategory,
  IncidenciaLocation,
  IncidenciaPriority,
  IncidenciaStatus,
} from "@/generated/prisma/enums";

export const INCIDENCIA_STATUS: Record<IncidenciaStatus, { label: string; className: string }> = {
  OPEN: { label: "Reportada", className: "bg-destructive/15 text-destructive border-destructive/30" },
  IN_PROGRESS: { label: "En curso", className: "bg-warning text-warning-foreground border-transparent" },
  RESOLVED: { label: "Resuelta", className: "bg-success text-success-foreground border-transparent" },
};

export const INCIDENCIA_PRIORITY: Record<IncidenciaPriority, string> = {
  NORMAL: "Normal",
  URGENT: "Urgente",
};

export const INCIDENCIA_LOCATION: Record<IncidenciaLocation, string> = {
  PORTAL: "Portal",
  ESCALERA: "Escalera",
  ASCENSOR: "Ascensor",
  GARAJE: "Garaje",
  TERRAZA: "Terraza / cubierta",
  FACHADA: "Fachada",
  PISCINA: "Piscina",
  ZONAS_COMUNES: "Zonas comunes",
  OTRO: "Otro",
};

export const DOCUMENT_CATEGORY: Record<DocumentCategory, string> = {
  ACTA: "Actas",
  ESTATUTOS: "Estatutos y normas",
  SEGURO: "Seguro",
  PRESUPUESTO: "Presupuestos",
  CONTRATO: "Contratos",
  FACTURA: "Facturas",
  CERTIFICADO: "Certificados (ITE, IEE…)",
  OTRO: "Otros",
};
