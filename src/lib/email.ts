import "server-only";
import { Resend } from "resend";
import { appUrl } from "@/lib/urls";

let client: Resend | null = null;
function resend() {
  if (!process.env.RESEND_API_KEY) return null;
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Sends an email through Resend. Without RESEND_API_KEY (local dev, CI) the
 * message is logged instead. Never throws: notification failures must not
 * break the user action that triggered them.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const from = process.env.EMAIL_FROM ?? "Mi Comunidad <avisos@micomunidad.app>";
  const r = resend();
  if (!r) {
    console.info("[email:dev]", { to: message.to, subject: message.subject });
    return true;
  }
  try {
    const { error } = await r.emails.send({ from, ...message });
    if (error) {
      console.error("[email] send failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send threw", err);
    return false;
  }
}

/** Send the same email to many recipients individually (privacy: no shared To:). */
export async function sendBulkEmail(recipients: string[], build: (to: string) => Omit<EmailMessage, "to">) {
  const unique = [...new Set(recipients.filter(Boolean))];
  const results = await Promise.allSettled(unique.map((to) => sendEmail({ to, ...build(to) })));
  return results.filter((r) => r.status === "fulfilled" && r.value).length;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Minimal branded layout shared by all transactional emails. */
export function emailLayout({
  title,
  body,
  cta,
  footer,
}: {
  title: string;
  body: string;
  cta?: { label: string; href: string };
  footer?: string;
}) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${cta.href}" style="background:#c2623f;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">${escapeHtml(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#fbf7f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#3b2a20">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<p style="font-weight:700;font-size:18px;color:#c2623f;margin:0 0 24px">Mi Comunidad</p>
<div style="background:#fff;border:1px solid #eadfcf;border-radius:16px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
${body}
${button}
</div>
<p style="font-size:12px;color:#8a7766;margin-top:20px">${footer ?? `Recibes este email porque formas parte de una comunidad en <a href="${appUrl()}" style="color:#8a7766">Mi Comunidad</a>. Puedes cambiar tus preferencias de notificación en tu perfil.`}</p>
</div></body></html>`;
}

/** Turn plain text into safe paragraphs. */
export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="line-height:1.55;margin:0 0 12px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}
