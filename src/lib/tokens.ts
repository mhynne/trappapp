import { randomBytes } from "node:crypto";

// Utelater tegn som er lette å forveksle (0/O, 1/l/I) slik at en token kan tastes
// inn for hånd hvis QR-koden er skadet.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Tilfeldig, ugjettbar token til QR-lenker. */
export function generateQrToken(length = 10): string {
  const bytes = randomBytes(length);
  let token = "";
  for (let i = 0; i < length; i++) {
    token += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return token;
}
