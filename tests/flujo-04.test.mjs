import { describe, expect, it } from "vitest";
import { loadNode } from "./helpers.mjs";

const env = { TELEGRAM_ADMIN_CHAT_ID: "123456", FOODZINDER_BASE_URL: "https://foodzinder.vercel.app" };
const stats = { json: { success: true, data: { period: { days: 7 }, users: { total: 13, new: 2, owners: 4 }, restaurants: { PENDING: 1, APPROVED: 10, REJECTED: 1, ARCHIVED: 0, new: 1 }, reviews: { total: 25, new: 3, averageScore: 4.1 }, menus: { total: 12, dishes: 65 }, webhooks: { delivered: 8, failed: 1, pending: 0 } } } };
const reviews = { json: { success: true, data: [{ restaurant: { name: "Casa Terral" }, average: 4.5, comment: "genial" }, { restaurant: { name: "Marina Blava" }, average: 2.1, comment: "regular" }] } };
const pending = { json: { success: true, data: [{ id: "p1", name: "Gràcia Verde", city: "Barcelona", owner: { email: "pol@x.cat" } }] } };
const gemini = (text) => ({ json: { candidates: [{ content: { parts: [{ text }] } }] } });

describe("nodo preparar-informe", () => {
  const run = loadNode("preparar-informe");
  it("construye el instrucciones con cifras, reseñas y pendientes", () => {
    const out = run(stats, reviews, pending)[0].json;
    expect(out.event).toBe("informe.semanal");
    expect(out.missing).toEqual([]);
    expect(out.pending[0]).toMatchObject({ name: "Gràcia Verde", owner: "pol@x.cat" });
    expect(out.instrucciones).toContain("MEJORES RESEÑAS: Casa Terral: 4.5/5");
    expect(out.instrucciones).toContain("Gràcia Verde");
    expect(out.geminiBody.generationConfig.maxOutputTokens).toBe(700);
  });
  it("sigue aunque falten llamadas y lo anota", () => {
    const out = run({ json: { error: "timeout" } }, reviews, { json: {} })[0].json;
    expect(out.stats).toBeNull();
    expect(out.missing).toEqual(["estadísticas", "pendientes"]);
  });
});

describe("nodo mensaje-informe", () => {
  const run = loadNode("mensaje-informe");
  const prep = { json: loadNode("preparar-informe")(stats, reviews, pending)[0].json };
  it("compone cifras, texto de IA, pendientes con enlace y un solo mensaje corto", () => {
    const out = run(gemini("Buena semana. Esta semana toca: revisar Gràcia Verde."), prep, env);
    expect(out).toHaveLength(1);
    const t = out[0].json.telegramBody.text;
    expect(out[0].json.aiUsed).toBe(true);
    expect(t).toContain("Informe semanal Foodzinder");
    expect(t).toContain("Usuarios: 13 (2 nuevos, 4 dueños)");
    expect(t).toContain("Buena semana.");
    expect(t).toContain('href="https://foodzinder.vercel.app/dashboard/admin/restaurants/p1"');
    expect(out[0].json.telegramBody.chat_id).toBe("123456");
  });
  it("sin IA manda las cifras igualmente", () => {
    const out = run({ json: { error: "quota" } }, prep, env);
    expect(out[0].json.aiUsed).toBe(false);
    expect(out[0].json.telegramBody.text).toContain("Sin redacción de IA");
  });
  it("trocea en varios mensajes si el informe es largo", () => {
    const out = run(gemini(Array.from({ length: 40 }, (_, i) => `Párrafo ${i} ` + "x".repeat(150)).join("\n\n")), prep, env);
    expect(out.length).toBeGreaterThan(1);
    expect(out[0].json.parts).toBe(out.length);
    for (const item of out) expect(item.json.telegramBody.text.length).toBeLessThanOrEqual(4000);
  });
});
