import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { LEGAL } from "@/lib/legal";
import { formatCents } from "@/lib/format";
import { PLAN_ORDER, PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos y condiciones" updatedAt={LEGAL.updatedAt}>
      <h2>1. Aviso legal</h2>
      <p>
        En cumplimiento del art. 10 de la Ley 34/2002 de Servicios de la Sociedad de la Información (LSSI): el titular de {LEGAL.brand} es{" "}
        <strong>{LEGAL.company}</strong>, NIF {LEGAL.nif}, con domicilio en {LEGAL.address}. Contacto:{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>2. Objeto</h2>
      <p>
        {LEGAL.brand} es una herramienta para que las comunidades de propietarios gestionen anuncios, incidencias, documentos, juntas,
        votaciones y cuotas. Al registrarte aceptas estos términos y la <a href="/privacidad">política de privacidad</a>.
      </p>

      <h2>3. Cuentas y comunidades</h2>
      <ul>
        <li>Te registras con tu teléfono, email o Google. Debes facilitar datos veraces y custodiar el acceso a tu cuenta.</li>
        <li>
          Quien crea una comunidad declara actuar en nombre de la comunidad de propietarios (como presidente o con su autorización) y asume ese
          cargo en la plataforma. El cargo puede transferirse a otro vecino en cualquier momento.
        </li>
        <li>La comunidad decide quién accede (enlace, invitación personal y aprobación manual) y puede dar de baja a sus miembros.</li>
      </ul>

      <h2>4. Responsabilidad sobre juntas y acuerdos</h2>
      <p>
        {LEGAL.brand} facilita convocatorias, cálculo de quórum y mayorías y actas conforme a la Ley 49/1960 de Propiedad Horizontal, pero{" "}
        <strong>no presta asesoramiento jurídico</strong>. La validez de cada junta y acuerdo depende también de los estatutos de la comunidad
        y de la normativa autonómica aplicable; la comunidad y sus órganos son responsables de verificarla. El acta generada debe ser revisada y
        firmada por el presidente y el secretario.
      </p>

      <h2>5. Planes, precios y pago</h2>
      <table>
        <thead><tr><th>Plan</th><th>Precio</th><th>Viviendas</th></tr></thead>
        <tbody>
          {PLAN_ORDER.map((id) => (
            <tr key={id}>
              <td>{PLANS[id].name}</td>
              <td>{formatCents(PLANS[id].priceCents, { round: true })}/mes</td>
              <td>{PLANS[id].maxUnits === null ? "Ilimitadas" : `Hasta ${PLANS[id].maxUnits}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul>
        <li>Los precios no incluyen IVA, que se añadirá en la factura emitida a nombre de la comunidad.</li>
        <li>Toda comunidad nueva disfruta de <strong>14 días de prueba gratuita</strong> de las funciones del plan Comunidad, sin tarjeta.</li>
        <li>
          Al terminar la prueba, si no se contrata un plan, la comunidad pasa al plan Gratis. Si tiene más viviendas de las que permite su
          plan, queda en <strong>modo solo lectura</strong>: los datos siguen accesibles y exportables, pero no se pueden crear contenidos
          nuevos hasta elegir un plan adecuado.
        </li>
        <li>Las suscripciones se cobran por adelantado cada mes mediante Stripe y se renuevan automáticamente.</li>
        <li>
          Puedes cambiar de plan o cancelar en cualquier momento desde «Plan y facturación». La cancelación surte efecto al final del periodo
          ya pagado; no se reembolsan periodos parciales salvo obligación legal.
        </li>
        <li>Si un cobro falla, Stripe lo reintentará durante unos días; si no se regulariza, la suscripción se cancelará.</li>
        <li>Podemos modificar los precios avisando con al menos 30 días de antelación.</li>
      </ul>

      <h2>6. Uso aceptable</h2>
      <p>
        No está permitido publicar contenidos ilícitos, ofensivos o que vulneren derechos de terceros, suplantar a otras personas, ni usar el
        servicio para enviar comunicaciones no relacionadas con la comunidad. Podemos retirar contenidos o suspender cuentas que incumplan
        estas normas.
      </p>

      <h2>7. Datos de la comunidad y encargo de tratamiento</h2>
      <p>
        La comunidad es titular de sus datos y contenidos. Nos concede únicamente la licencia necesaria para alojarlos y mostrarlos a sus
        miembros. En relación con los datos personales que la comunidad gestiona, {LEGAL.company} actúa como <strong>encargado del
        tratamiento</strong> (art. 28 RGPD) y se compromete a: tratarlos solo según las instrucciones de la comunidad y para prestar el
        servicio; mantener la confidencialidad; aplicar medidas de seguridad adecuadas; recurrir solo a los subencargados indicados en la
        política de privacidad; ayudar a la comunidad a atender los derechos de los interesados; notificar sin dilación las violaciones de
        seguridad; y, al finalizar el servicio, devolver o suprimir los datos, salvo obligación legal de conservación. Los administradores de
        fincas pueden solicitar un contrato de encargo específico en <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>

      <h2>8. Disponibilidad</h2>
      <p>
        Trabajamos para que el servicio esté disponible de forma continua, pero puede haber interrupciones por mantenimiento o causas ajenas.
        No garantizamos la entrega de notificaciones por canales de terceros (SMS, email, WhatsApp), aunque registramos cada envío.
      </p>

      <h2>9. Responsabilidad</h2>
      <p>
        Salvo dolo o culpa grave, nuestra responsabilidad se limita al importe pagado por la comunidad en los doce meses anteriores. Nada en
        estos términos limita los derechos que la ley reconoce a los consumidores.
      </p>

      <h2>10. Baja</h2>
      <p>
        Puedes eliminar tu cuenta desde «Mi cuenta» y descargar antes tus datos. El presidente debe transferir su cargo antes de darse de baja.
        Si la comunidad deja de usar el servicio, podrá solicitar la exportación de sus datos.
      </p>

      <h2>11. Ley aplicable</h2>
      <p>
        Estos términos se rigen por la ley española. Para cualquier controversia serán competentes los juzgados y tribunales del domicilio del
        consumidor o, si no lo es, los del domicilio de {LEGAL.company}. También puedes acudir a la plataforma europea de resolución de
        litigios en línea.
      </p>
    </LegalPage>
  );
}
