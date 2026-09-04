import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { signPayload, verifySignature } from "../src/lib/signature.mjs";
import { loadNode, webhookItem } from "./helpers.mjs";

const crypto = createRequire(import.meta.url)("crypto");
const secret = "secreto-de-prueba";
const envelope = { id: "evt-1", event: "webhook.test", version: 1, occurredAt: "2026-09-04T10:00:00.000Z", data: { message: "hola" } };
const body = JSON.stringify(envelope);

describe("src/lib/signature", () => {
  it("firma con el formato sha256=<hex> del contrato", () => {
    expect(signPayload(body, secret)).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
  it("verifica y rechaza", () => {
    const sig = signPayload(body, secret);
    expect(verifySignature(body, sig, secret)).toBe(true);
    expect(verifySignature(body + " ", sig, secret)).toBe(false);
    expect(verifySignature(body, sig, "otro")).toBe(false);
    expect(verifySignature(body, null, secret)).toBe(false);
    expect(verifySignature(body, "sha256=corta", secret)).toBe(false);
  });
});

describe("nodo verificar-firma", () => {
  const run = loadNode("verificar-firma");
  const env = { FOODZINDER_WEBHOOK_SECRET: secret };

  it("acepta un evento firmado con el cuerpo crudo y devuelve el sobre", () => {
    const item = webhookItem(body, { "x-foodzinder-signature": signPayload(body, secret), "x-foodzinder-delivery": "d-1" });
    const out = run(item, env, crypto);
    expect(out).toHaveLength(1);
    expect(out[0].json).toMatchObject({ id: "evt-1", event: "webhook.test", _verified: true, _delivery: "d-1" });
  });

  it("firma exactamente los bytes recibidos, no el JSON reserializado", () => {
    const pretty = JSON.stringify(envelope, null, 2); // mismos datos, distintos bytes
    const item = webhookItem(pretty, { "x-foodzinder-signature": signPayload(pretty, secret) });
    expect(run(item, env, crypto)[0].json.id).toBe("evt-1");
    const wrong = webhookItem(pretty, { "x-foodzinder-signature": signPayload(body, secret) });
    expect(() => run(wrong, env, crypto)).toThrow(/Firma inválida/);
  });

  it("lanza sin cabecera, con firma incorrecta o sin secreto configurado", () => {
    expect(() => run(webhookItem(body, {}), env, crypto)).toThrow(/sin cabecera/);
    expect(() => run(webhookItem(body, { "x-foodzinder-signature": "sha256=" + "0".repeat(64) }), env, crypto)).toThrow(/Firma inválida/);
    expect(() => run(webhookItem(body, { "x-foodzinder-signature": signPayload(body, secret) }), {}, crypto)).toThrow(/FOODZINDER_WEBHOOK_SECRET/);
  });

  it("funciona también sin Raw Body (cuerpo ya parseado)", () => {
    const item = { json: { headers: { "x-foodzinder-signature": signPayload(body, secret) }, body: envelope } };
    expect(run(item, env, crypto)[0].json.event).toBe("webhook.test");
  });
});

describe("nodo normalizar-evento", () => {
  const run = loadNode("normalizar-evento");
  it("deja el sobre plano y conserva la entrega", () => {
    const out = run({ json: { ...envelope, _delivery: "d-1", _verified: true } });
    expect(out[0].json).toEqual({ id: "evt-1", event: "webhook.test", occurredAt: envelope.occurredAt, delivery: "d-1", data: { message: "hola" }, known: true });
  });
  it("rechaza versión distinta, sobre incompleto y evento desconocido", () => {
    expect(() => run({ json: { ...envelope, version: 2 } })).toThrow(/Versión/);
    expect(() => run({ json: { version: 1, event: "webhook.test" } })).toThrow(/incompleto/);
    expect(() => run({ json: { ...envelope, event: "pizza.ordered" } })).toThrow(/desconocido/);
  });
});

describe("nodo registrar", () => {
  const run = loadNode("registrar");
  const ev = { json: { id: "evt-1", event: "review.created" } };
  it("resume en una línea con el evento del nodo normalizar y el resultado del último nodo", () => {
    const out = run([{ json: { action: "email-dueno", result: "enviado a x@y.z" } }], ev, new Date("2026-09-04T10:00:00Z"));
    expect(out[0].json.summary).toBe("review.created evt-1 -> email-dueno: enviado a x@y.z");
    expect(out[0].json.loggedAt).toBe("2026-09-04T10:00:00.000Z");
  });
  it("cuando lo que llega es la respuesta de Telegram, no pierde el evento", () => {
    expect(run([{ json: { ok: true, result: undefined } }], ev)[0].json.summary).toBe("review.created evt-1 -> sin acción: telegram ok");
    expect(run([{ json: { error: { message: "Not Found" } } }], ev)[0].json.summary).toBe("review.created evt-1 -> sin acción: error: Not Found");
  });
});
