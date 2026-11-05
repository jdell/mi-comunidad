import type { Metadata } from "next";
import QRCode from "qrcode";
import { LogoMark } from "@/components/logo";
import { PrintButton } from "@/components/app/print-button";
import { requireMember } from "@/lib/auth";
import { MANAGER_ROLES } from "@/lib/roles";
import { appUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "Póster QR" };

export default async function PosterPage({ params }: PageProps<"/c/[id]/invitar/poster">) {
  const { id } = await params;
  const { comunidad } = await requireMember(id, MANAGER_ROLES);
  const link = appUrl(`/unirse/${comunidad.inviteCode}`);
  const svg = await QRCode.toString(link, { type: "svg", margin: 1, width: 320, color: { dark: "#3b2a20", light: "#ffffff" } });

  return (
    <div className="space-y-4">
      <div className="no-print flex justify-end">
        <PrintButton />
      </div>
      <div className="mx-auto flex aspect-[1/1.414] max-w-xl flex-col items-center justify-between rounded-2xl border bg-white p-10 text-center text-[#3b2a20] print:max-w-none print:rounded-none print:border-0">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-[#c2623f]">Comunidad de propietarios</p>
          <h1 className="font-heading text-4xl font-semibold">Tu comunidad ahora es digital</h1>
        </div>
        <div className="w-64 sm:w-72" dangerouslySetInnerHTML={{ __html: svg }} />
        <div className="space-y-2">
          <p className="text-lg">Escanea el código QR con tu móvil para unirte</p>
          <p className="text-sm">o entra en <span className="font-mono font-medium">{link.replace(/^https?:\/\//, "")}</span></p>
          <p className="text-sm">Código: <span className="font-mono text-lg font-semibold">{comunidad.inviteCode}</span></p>
        </div>
        <div className="space-y-1">
          <p className="font-heading text-xl font-semibold">{comunidad.name}</p>
          <p className="text-sm">{comunidad.address}</p>
          <div className="flex items-center justify-center gap-2 pt-3 text-sm">
            <LogoMark className="size-5" /> Mi Comunidad
          </div>
        </div>
      </div>
    </div>
  );
}
