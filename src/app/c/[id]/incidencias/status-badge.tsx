import type { IncidenciaStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { INCIDENCIA_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function IncidenciaStatusBadge({ status }: { status: IncidenciaStatus }) {
  const s = INCIDENCIA_STATUS[status];
  return <Badge className={cn("border", s.className)}>{s.label}</Badge>;
}
