import { randomBytes } from "node:crypto";

// Unambiguous alphabet (no 0/O, 1/I/L) for codes people may type or read aloud.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateCode(length = 8) {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
