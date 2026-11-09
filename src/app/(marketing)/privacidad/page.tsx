import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updatedAt={LEGAL.updatedAt}>
      <p>
        En {LEGAL.brand} nos tomamos en serio la privacidad de presidentes y vecinos. Esta política explica qué datos tratamos, para qué, con
        qué base jurídica y cómo puedes ejercer tus derechos, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 de
        Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).
      </p>

      <h2>1. Quién trata tus datos</h2>
      <p>
        <strong>{LEGAL.company}</strong> (NIF {LEGAL.nif}, {LEGAL.address}), titular de {LEGAL.brand}. Contacto de privacidad:{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
      <ul>
        <li>
          <strong>Como responsable del tratamiento</strong>, tratamos los datos de tu cuenta (nombre, teléfono, email), la facturación de las
          suscripciones y las comunicaciones sobre el servicio.
        </li>
        <li>
          <strong>Como encargado del tratamiento</strong> (art. 28 RGPD), tratamos por cuenta de cada comunidad de propietarios los datos que
          la comunidad gestiona en la plataforma: viviendas, coeficientes, anuncios, incidencias, documentos, juntas, votaciones y cuotas. La
          <strong> comunidad de propietarios es la responsable</strong> de esos datos, y el encargo se rige por nuestros{" "}
          <a href="/terminos">términos</a>.
        </li>
      </ul>

      <h2>2. Qué datos tratamos</h2>
      <ul>
        <li>Identificación y contacto: nombre, teléfono móvil, email.</li>
        <li>Datos de la comunidad: vivienda, planta, puerta, coeficiente de participación y cargo (presidente, secretario, tesorero).</li>
        <li>Contenido que publicas: anuncios, incidencias y sus fotos, comentarios y documentos.</li>
        <li>Juntas: asistencia, delegaciones de voto y sentido del voto (necesario para el acta, art. 19 LPH).</li>
        <li>Cuotas: importes, vencimientos y estado de pago de cada vivienda.</li>
        <li>Facturación de la suscripción: datos fiscales de la comunidad. Los datos de tarjeta los gestiona Stripe; nosotros no los vemos.</li>
        <li>Datos técnicos: registros de acceso y de envío de notificaciones.</li>
      </ul>
      <p>No pedimos documentos de identidad ni datos especialmente protegidos. Aplicamos el principio de minimización.</p>

      <h2>3. Para qué y con qué base jurídica</h2>
      <table>
        <thead><tr><th>Finalidad</th><th>Base jurídica</th></tr></thead>
        <tbody>
          <tr><td>Crear tu cuenta y prestarte el servicio</td><td>Ejecución del contrato (art. 6.1.b RGPD)</td></tr>
          <tr><td>Gestión de la comunidad: convocatorias, actas, quórum, cuotas y avisos de deuda</td><td>Cumplimiento de obligaciones de la comunidad conforme a la Ley de Propiedad Horizontal e interés legítimo (art. 6.1.c y 6.1.f)</td></tr>
          <tr><td>Avisos de la comunidad por email</td><td>Ejecución del contrato; puedes desactivarlos en Ajustes salvo las convocatorias y avisos de deuda</td></tr>
          <tr><td>Avisos por WhatsApp</td><td>Consentimiento (art. 6.1.a), que puedes retirar en cualquier momento en Ajustes</td></tr>
          <tr><td>Consejos de uso y emails de reactivación al presidente</td><td>Interés legítimo; puedes oponerte desde Mi cuenta</td></tr>
          <tr><td>Facturación y obligaciones fiscales</td><td>Obligación legal (art. 6.1.c)</td></tr>
          <tr><td>Encuestas de satisfacción (NPS)</td><td>Interés legítimo en mejorar el servicio; son voluntarias</td></tr>
        </tbody>
      </table>

      <h2>4. Cuánto tiempo los conservamos</h2>
      <ul>
        <li>Datos de cuenta: mientras la mantengas activa. Si la eliminas, anonimizamos tus datos de inmediato.</li>
        <li>
          Datos de la comunidad: mientras la comunidad use el servicio. La LPH obliga a conservar las actas y, durante al menos cinco años,
          las convocatorias y demás documentos de las juntas (art. 20.e); por eso, al darte de baja, esos registros se conservan
          anonimizados.
        </li>
        <li>Facturación: los plazos exigidos por la normativa mercantil y tributaria (hasta 6 años).</li>
      </ul>

      <h2>5. Con quién los compartimos</h2>
      <p>No vendemos datos. Solo los compartimos con proveedores que nos ayudan a prestar el servicio, con contrato de encargo:</p>
      <table>
        <thead><tr><th>Proveedor</th><th>Servicio</th><th>Ubicación</th></tr></thead>
        <tbody>
          <tr><td>Supabase</td><td>Base de datos, autenticación y archivos</td><td>Unión Europea (Frankfurt)</td></tr>
          <tr><td>Vercel</td><td>Alojamiento de la aplicación</td><td>UE (región Frankfurt); posibles accesos desde EE. UU.*</td></tr>
          <tr><td>Stripe</td><td>Cobro de suscripciones</td><td>UE / EE. UU.*</td></tr>
          <tr><td>Resend</td><td>Envío de emails</td><td>EE. UU.*</td></tr>
          <tr><td>Meta (WhatsApp Business)</td><td>Envío de avisos por WhatsApp, solo si lo activas</td><td>UE / EE. UU.*</td></tr>
          <tr><td>Proveedor de SMS de Supabase</td><td>Envío del código de acceso</td><td>UE / EE. UU.*</td></tr>
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground">
        * Transferencias internacionales amparadas en el Marco de Privacidad de Datos UE-EE. UU. o en cláusulas contractuales tipo de la
        Comisión Europea.
      </p>
      <p>Dentro de cada comunidad, los vecinos ven el nombre y la vivienda de los demás; los datos de contacto solo los ve la junta directiva.</p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad. Desde{" "}
        <a href="/cuenta">Mi cuenta</a> puedes descargar todos tus datos y eliminar tu cuenta. También puedes escribirnos a{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Para los datos que gestiona tu comunidad, puedes dirigirte también a su
        presidente; nosotros le ayudaremos a atender tu solicitud.
      </p>
      <p>
        Si consideras que no hemos tratado bien tus datos, puedes reclamar ante la Agencia Española de Protección de Datos (
        <a href="https://www.aepd.es" target="_blank" rel="noreferrer">www.aepd.es</a>).
      </p>

      <h2>7. Cookies</h2>
      <p>
        Solo usamos cookies técnicas imprescindibles para mantener tu sesión iniciada y guardamos tu preferencia de apariencia (claro/oscuro) en
        tu navegador. Están exentas de consentimiento (art. 22.2 LSSI). No usamos cookies de analítica ni de publicidad; si algún día lo
        hiciéramos, te pediríamos permiso antes.
      </p>

      <h2>8. Menores</h2>
      <p>El servicio no está dirigido a menores de 14 años (art. 7 LOPDGDD).</p>

      <h2>9. Seguridad</h2>
      <p>
        Cifrado en tránsito (HTTPS), archivos privados accesibles solo mediante enlaces temporales, control de acceso por comunidad y por
        cargo, y copias de seguridad en la UE.
      </p>

      <h2>10. Cambios</h2>
      <p>Si cambiamos esta política de forma relevante, te lo comunicaremos por email o en la aplicación.</p>
    </LegalPage>
  );
}
