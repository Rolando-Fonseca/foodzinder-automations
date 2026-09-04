import { describe, expect, it } from "vitest";
import { loadNode, loadShared } from "./helpers.mjs";

const env = { TELEGRAM_ADMIN_CHAT_ID: "123456", FOODZINDER_BASE_URL: "https://foodzinder.vercel.app/" };
const restaurant = {
  id: "7f2573a0-d2b2-4246-b66b-98a67e70997e",
  slug: "casa-terral",
  name: "Casa <Terral>",
  city: "Madrid",
  status: "PENDING",
  priceRange: "MODERATE",
  cuisines: [{ name: "Española" }],
  owner: { id: "u1", email: "lucia@casaterral.es", name: "Lucía" },
};
const event = { json: { id: "evt-1", event: "restaurant.created", occurredAt: "2026-09-04T10:00:00Z", data: restaurant } };
const gemini = (text) => ({ json: { candidates: [{ content: { parts: [{ text }] } }] } });

describe("shared/gemini", () => {
  const { buildGeminiRequest, parseGeminiText, parseGeminiJson } = loadShared("gemini");
  it("construye la petición con temperatura, tokens y JSON opcional", () => {
    const b = buildGeminiRequest("hola", { temperature: 0.2, maxOutputTokens: 100, json: true });
    expect(b.contents[0].parts[0].text).toBe("hola");
    expect(b.generationConfig).toEqual({ temperature: 0.2, maxOutputTokens: 100, responseMimeType: "application/json" });
  });
  it("parsea texto y JSON con vallas, y devuelve null ante errores", () => {
    expect(parseGeminiText(gemini(" hola ").json)).toBe("hola");
    expect(parseGeminiText({ error: { message: "quota" } })).toBeNull();
    expect(parseGeminiText(undefined)).toBeNull();
    expect(parseGeminiJson(gemini('```json\n{"categoria":"trato","borrador":"x"}\n```').json)).toEqual({ categoria: "trato", borrador: "x" });
    expect(parseGeminiJson(gemini("esto no es json").json)).toBeNull();
  });
});

describe("shared/telegram", () => {
  const { escapeHtml, tgMessage, splitTelegram } = loadShared("telegram");
  it("escapa HTML y monta el teclado inline", () => {
    expect(escapeHtml("<b> & c")).toBe("&lt;b&gt; &amp; c");
    const b = tgMessage("1", "hola", [[{ text: "Sí", data: "yes:1" }]]);
    expect(b).toMatchObject({ chat_id: "1", parse_mode: "HTML", reply_markup: { inline_keyboard: [[{ text: "Sí", callback_data: "yes:1" }]] } });
    expect(tgMessage("1", "hola").reply_markup).toBeUndefined();
  });
  it("parte mensajes largos por párrafos sin superar el límite", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Párrafo ${i} ` + "x".repeat(200)).join("\n\n");
    const chunks = splitTelegram(text, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1000);
    expect(chunks.join("\n\n")).toBe(text);
  });
});

describe("shared/prompts", () => {
  const p = loadShared("prompts");
  it("el prompt de resumen incluye los datos, la orden de no inventar y el formato", () => {
    const t = p.promptResumenRestaurante(restaurant);
    expect(t).toContain("Casa <Terral>");
    expect(t).toContain("Española");
    expect(t).toContain("no lo inventes");
    expect(t).toContain("Máximo 90 palabras");
    expect(t).toContain("Teléfono: sin indicar");
  });
  it("el prompt de reseña pide JSON con las dos claves", () => {
    const t = p.promptRespuestaResena({ restaurant: { name: "X" }, author: { name: "Iker" }, ratings: { AMBIANCE: 2, SERVICE: 1, FOOD: 3, VALUE: 2 }, average: 2, comment: "frío" });
    expect(t).toContain('"categoria"');
    expect(t).toContain('"borrador"');
    expect(t).toContain("servicio 1");
  });
  it("el informe semanal lista mejores y peores reseñas", () => {
    const t = p.promptInformeSemanal({ users: { total: 13, new: 2, owners: 4 }, restaurants: { APPROVED: 10, PENDING: 1, REJECTED: 1, new: 0 }, reviews: { new: 3, total: 25, averageScore: 4.1 }, webhooks: { delivered: 5, failed: 0 } }, [{ restaurant: { name: "A" }, average: 4.8 }, { restaurant: { name: "B" }, average: 2.1, comment: "mal" }], [{ name: "Pendiente 1" }]);
    expect(t).toContain("MEJORES RESEÑAS: A: 4.8/5");
    expect(t).toContain("PEORES RESEÑAS: B: 2.1/5");
    expect(t).toContain("Pendiente 1");
  });
});

describe("nodo preparar-resumen", () => {
  it("añade prompt y cuerpo de Gemini conservando el evento", () => {
    const out = loadNode("preparar-resumen")(event);
    expect(out[0].json.id).toBe("evt-1");
    expect(out[0].json.prompt).toContain("Casa <Terral>");
    expect(out[0].json.geminiBody.generationConfig.temperature).toBe(0.2);
  });
});

describe("nodo mensaje-admin", () => {
  const run = loadNode("mensaje-admin");
  it("con resumen de IA: mensaje HTML escapado, enlace al panel y dos botones", () => {
    const out = run(gemini("Casa de comidas castellana.\n\n- Falta teléfono"), event, env)[0].json;
    expect(out.aiUsed).toBe(true);
    const b = out.telegramBody;
    expect(b.chat_id).toBe("123456");
    expect(b.text).toContain("Casa &lt;Terral&gt;");
    expect(b.text).toContain("Nuevo restaurante pendiente");
    expect(b.text).toContain("https://foodzinder.vercel.app/dashboard/admin/restaurants/7f2573a0-d2b2-4246-b66b-98a67e70997e");
    expect(b.reply_markup.inline_keyboard[0].map((x) => x.callback_data)).toEqual([`approve:${restaurant.id}`, `reject:${restaurant.id}`]);
  });
  it("sin IA (error de Gemini): el aviso llega igual con los datos crudos", () => {
    const out = run({ json: { error: { message: "quota" } } }, event, env)[0].json;
    expect(out.aiUsed).toBe(false);
    expect(out.telegramBody.text).toContain("Sin resumen de IA");
    expect(out.telegramBody.text).toContain("MODERATE");
  });
  it("distingue un reenvío", () => {
    const out = run(gemini("x"), { json: { ...event.json, event: "restaurant.resubmitted" } }, env)[0].json;
    expect(out.telegramBody.text).toContain("reenviado tras rechazo");
  });
});

describe("nodo parsear-callback", () => {
  const run = loadNode("parsear-callback");
  const cq = (data, chat = 123456) => ({ json: { body: { callback_query: { id: "cq1", data, from: { first_name: "Marta" }, message: { message_id: 77, chat: { id: chat }, text: "Nuevo restaurante" } } } } });
  it("acepta approve/reject del administrador", () => {
    const out = run(cq(`approve:${restaurant.id}`), env)[0].json;
    expect(out).toMatchObject({ kind: "callback", valid: true, action: "approve", restaurantId: restaurant.id, chatId: "123456", messageId: 77, from: "Marta" });
  });
  it("rechaza otro chat o datos raros", () => {
    expect(run(cq(`approve:${restaurant.id}`, 999), env)[0].json).toMatchObject({ valid: false, reason: "chat no autorizado" });
    expect(run(cq("hack:1"), env)[0].json).toMatchObject({ valid: false, reason: "callback_data desconocido" });
  });
  it("lee el motivo de rechazo de una respuesta al mensaje del bot", () => {
    const upd = { json: { body: { message: { message_id: 80, chat: { id: 123456 }, from: { first_name: "Marta" }, text: "La dirección no existe en el callejero", reply_to_message: { text: `Motivo de rechazo para ${restaurant.id}\n\nResponde…` } } } } };
    expect(run(upd, env)[0].json).toMatchObject({ kind: "reject-reason", valid: true, action: "reject", restaurantId: restaurant.id, rejectReason: "La dirección no existe en el callejero" });
    const short = { json: { body: { ...upd.json.body, message: { ...upd.json.body.message, text: "corto" } } } };
    expect(run(short, env)[0].json).toMatchObject({ valid: false, reason: expect.stringContaining("corto") });
  });
  it("ignora otras actualizaciones", () => {
    expect(run({ json: { body: { message: { chat: { id: 123456 }, text: "hola" } } } }, env)[0].json.kind).toBe("ignored");
  });
});

describe("nodo confirmar-accion y pedir-motivo", () => {
  it("edita el mensaje original al aprobar y responde al botón", () => {
    const cb = { json: { action: "approve", chatId: "123456", messageId: 77, callbackQueryId: "cq1", from: "Marta", originalText: "Nuevo restaurante\nCasa Terral" } };
    const out = loadNode("confirmar-accion")({ json: { success: true, data: { status: "APPROVED" } } }, cb, new Date("2026-09-04T08:42:00Z"))[0].json;
    expect(out.apiOk).toBe(true);
    expect(out.editBody).toMatchObject({ chat_id: "123456", message_id: 77, reply_markup: { inline_keyboard: [] } });
    expect(out.editBody.text).toContain("Aprobado</b> por Marta a las");
    expect(out.answerBody).toEqual({ callback_query_id: "cq1", text: "Hecho" });
  });
  it("informa del fallo de la API", () => {
    const cb = { json: { action: "reject", rejectReason: "motivo", chatId: "1", messageId: 2, from: "M" } };
    const out = loadNode("confirmar-accion")({ json: { success: false, error: "No se puede pasar de APPROVED a REJECTED" } }, cb)[0].json;
    expect(out.result).toBe("fallo");
    expect(out.editBody.text).toContain("No se pudo rechazar");
  });
  it("pedir-motivo fuerza respuesta y lleva el id", () => {
    const out = loadNode("pedir-motivo")({ json: { restaurantId: restaurant.id, chatId: "1", callbackQueryId: "cq" } })[0].json;
    expect(out.askBody.text).toContain(`Motivo de rechazo para ${restaurant.id}`);
    expect(out.askBody.reply_markup.force_reply).toBe(true);
  });
});

describe("nodo evaluar-ping", () => {
  const run = loadNode("evaluar-ping");
  it("ok cuando la API responde con data; no avisa", () => {
    const out = run({ json: { success: true, data: [] } }, {}, env, new Date())[0].json;
    expect(out).toMatchObject({ ok: true, shouldAlert: false, telegramBody: null });
  });
  it("avisa cuando falla y como mucho una vez por hora", () => {
    const now = new Date("2026-09-04T10:00:00Z");
    const first = run({ json: { error: "timeout" } }, {}, env, now)[0].json;
    expect(first.shouldAlert).toBe(true);
    expect(first.telegramBody.text).toContain("no responde");
    const again = run({ json: { error: "timeout" } }, first.nextState, env, new Date(now.getTime() + 10 * 60 * 1000))[0].json;
    expect(again.shouldAlert).toBe(false);
    const later = run({ json: { error: "timeout" } }, first.nextState, env, new Date(now.getTime() + 61 * 60 * 1000))[0].json;
    expect(later.shouldAlert).toBe(true);
  });
});
