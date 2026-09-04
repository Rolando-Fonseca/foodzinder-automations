// Envía a un n8n un evento con la forma exacta del contrato de Foodzinder,
// firmado con FOODZINDER_WEBHOOK_SECRET del .env. Uso:
//   node scripts/send-event.mjs <evento> [--url http://localhost:5678/webhook/foodzinder]
//        [--test] [--bad-signature] [--average 2] [--to correo] [--comment "texto"]
// --test apunta a /webhook-test/ (el botón "Listen for test event" del editor).
import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { signPayload, SIGNATURE_HEADER, EVENT_HEADER, DELIVERY_HEADER } from "../src/lib/signature.mjs";
import { sampleEvent } from "../src/lib/samples.mjs";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const args = process.argv.slice(2);
const event = args.find((a) => !a.startsWith("--"));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

if (!event) {
  console.error("Uso: node scripts/send-event.mjs <evento> [--url] [--test] [--bad-signature] [--average N] [--to correo] [--comment texto]");
  process.exit(2);
}
const secret = process.env.FOODZINDER_WEBHOOK_SECRET;
if (!secret) {
  console.error("Falta FOODZINDER_WEBHOOK_SECRET en .env");
  process.exit(2);
}

const base = process.env.N8N_URL || `http://localhost:${process.env.N8N_HOST_PORT || 5679}`;
const url = flag("url") || `${base}/${has("test") ? "webhook-test" : "webhook"}/foodzinder`;

const envelope = {
  id: randomUUID(),
  event,
  version: 1,
  occurredAt: new Date().toISOString(),
  data: await sampleEvent(event, { average: flag("average") ? Number(flag("average")) : undefined, to: flag("to"), comment: flag("comment"), baseUrl: process.env.FOODZINDER_BASE_URL }),
};
const body = JSON.stringify(envelope);
const signature = has("bad-signature") ? "sha256=" + "0".repeat(64) : signPayload(body, secret);

console.log(`POST ${url}\n  ${EVENT_HEADER}: ${event}\n  ${DELIVERY_HEADER}: ${envelope.id}\n  ${SIGNATURE_HEADER}: ${signature.slice(0, 20)}…`);
const started = Date.now();
try {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", [EVENT_HEADER]: event, [DELIVERY_HEADER]: envelope.id, [SIGNATURE_HEADER]: signature, "User-Agent": "Foodzinder-Webhooks/1.0 (send-event)" },
    body,
  });
  const text = await res.text();
  console.log(`-> ${res.status} en ${Date.now() - started} ms: ${text.slice(0, 200)}`);
  process.exit(res.ok ? 0 : 1);
} catch (e) {
  console.error(`-> error de red: ${e.message}. ¿Está n8n en ${base}?`);
  process.exit(1);
}
