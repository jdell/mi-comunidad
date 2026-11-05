import "server-only";

/**
 * WhatsApp Business Cloud API (Meta). Business-initiated messages must use a
 * pre-approved template. We use one generic Spanish template per notification:
 *
 *   Name: WHATSAPP_TEMPLATE (default "mi_comunidad_aviso"), language "es"
 *   Body: "📢 {{1}}: {{2}}\n\nMás información: {{3}}"
 *
 * Without WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID the call is a logged no-op.
 */
const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? "v21.0";

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** WhatsApp wants E.164 digits without "+". */
export function toWhatsAppNumber(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

/** Template parameters cannot contain newlines/tabs or > 4 consecutive spaces, and are length-limited. */
export function sanitizeParam(text: string, max = 900) {
  const clean = text.replace(/[\n\t\r]+/g, " · ").replace(/ {4,}/g, "   ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export interface WhatsAppResult {
  ok: boolean;
  error?: string;
}

export async function sendWhatsAppNotification(opts: {
  to: string;
  comunidad: string;
  message: string;
  link: string;
}): Promise<WhatsAppResult> {
  if (!whatsappConfigured()) {
    console.info("[whatsapp:dev]", { to: opts.to, message: opts.message });
    return { ok: true };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toWhatsAppNumber(opts.to),
        type: "template",
        template: {
          name: process.env.WHATSAPP_TEMPLATE ?? "mi_comunidad_aviso",
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "es" },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: sanitizeParam(opts.comunidad, 120) },
                { type: "text", text: sanitizeParam(opts.message) },
                { type: "text", text: opts.link },
              ],
            },
          ],
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[whatsapp] send failed", res.status, body);
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[whatsapp] send threw", err);
    return { ok: false, error: err instanceof Error ? err.message : "error" };
  }
}
