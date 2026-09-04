import { createHmac, timingSafeEqual } from "node:crypto";

export const SIGNATURE_HEADER = "x-foodzinder-signature";
export const EVENT_HEADER = "x-foodzinder-event";
export const DELIVERY_HEADER = "x-foodzinder-delivery";

/** Firma un cuerpo (bytes exactos) con HMAC-SHA256, formato del contrato del P4. */
export function signPayload(body, secret) {
  return "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex");
}

/** Verifica en tiempo constante. Nunca lanza: devuelve false ante cualquier anomalía. */
export function verifySignature(body, signature, secret) {
  if (!signature || !secret || typeof signature !== "string") return false;
  const expected = Buffer.from(signPayload(body, secret), "utf8");
  const given = Buffer.from(signature, "utf8");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}
