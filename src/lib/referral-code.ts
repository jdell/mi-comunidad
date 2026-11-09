// Referral code format: "MC-XXXX" (4 chars from an unambiguous alphabet). Pure helpers.

export const REFERRAL_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const REFERRAL_COOKIE = "mc_ref";
const RE = /^MC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

export function generateReferralCode() {
  // Web Crypto works in every runtime (Node, proxy, edge). Modulo bias over 31 symbols is negligible here.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(4));
  return `MC-${Array.from(bytes, (b) => REFERRAL_ALPHABET[b % REFERRAL_ALPHABET.length]).join("")}`;
}

/** Accepts "mc-ab3k", "MCAB3K", " MC-AB3K " → "MC-AB3K"; anything else → null. */
export function normalizeReferralCode(input: string | null | undefined) {
  if (!input) return null;
  const raw = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw.startsWith("MC") || raw.length !== 6) return null;
  const code = `MC-${raw.slice(2)}`;
  return RE.test(code) ? code : null;
}
