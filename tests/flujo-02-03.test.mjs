import { describe, expect, it } from "vitest";
import { loadNode, loadShared } from "./helpers.mjs";

const env = { TELEGRAM_ADMIN_CHAT_ID: "123456", FOODZINDER_BASE_URL: "https://foodzinder.vercel.app" };
const gemini = (text) => ({ json: { candidates: [{ content: { parts: [{ text }] } }] } });
const owner = { id: "u1", email: "lucia@casaterral.es", name: "Lucía" };
const approved = { json: { id: "evt-2", event: "restaurant.approved", occurredAt: "2026-09-04T10:00:00Z", data: { id: "r1", slug: "casa-terral", name: "Casa Terral", city: "Madrid", owner, publicUrl: "https://foodzinder.vercel.app/restaurant/casa-terral" } } };
const ficha = { json: { success: true, data: { id: "r1", slug: "casa-terral", name: "Casa Terral", city: "Madrid", description: null, coverUrl: null, menus: [{ title: "Carta", categories: [{ name: "Principales", dishes: [{ name: "Cocido", allergens: [] }, { name: "Croquetas", allergens: [{ name: "Gluten" }] }] }] }] } } };

describe("shared/email", () => {
  const { emailLayout, htmlToText } = loadShared("email");
  it("envuelve el cuerpo y el texto plano conserva el contenido", () => {
    const html = emailLayout("Título", "<p>Hola <b>mundo</b></p><ul><li>uno</li><li>dos</li></ul>");
    expect(html).toContain("<h1");
    expect(html).toContain("Foodzinder");
    const text = htmlToText(html);
    expect(text).toContain("Hola mundo");
    expect(text).toContain("- uno");
    expect(text).not.toContain("<");
  });
});

describe("rama 02: bienvenida", () => {
  it("preparar-consejos usa la ficha pública y cae al evento si la API falla", () => {
    const run = loadNode("preparar-consejos");
    const withFicha = run(ficha, approved)[0].json;
    expect(withFicha.prompt).toContain("Cocido (sin alérgenos declarados)");
    expect(withFicha.prompt).toContain("Croquetas (Gluten)");
    const noFicha = run({ json: { error: "timeout" } }, approved)[0].json;
    expect(noFicha.ficha.menus).toEqual([]);
    expect(noFicha.prompt).toContain("Casa Terral");
  });

  it("email-bienvenida lleva URL pública, consejos de IA como lista y destinatario", () => {
    const prep = { json: { ...approved.json, ficha: ficha.json.data } };
    const out = loadNode("email-bienvenida")(gemini("- Declara los alérgenos del cocido.\n- Añade una descripción.\n- Sube una foto."), prep, env)[0].json;
    expect(out.aiUsed).toBe(true);
    expect(out.email.to).toBe("lucia@casaterral.es");
    expect(out.email.subject).toBe("Casa Terral ya está publicado en Foodzinder");
    expect(out.email.html).toContain("https://foodzinder.vercel.app/restaurant/casa-terral");
    expect((out.email.html.match(/<li>/g) || []).length).toBe(3);
    expect(out.email.text).toContain("Declara los alérgenos del cocido.");
  });

  it("sin IA usa consejos genéricos", () => {
    const prep = { json: { ...approved.json, ficha: ficha.json.data } };
    const out = loadNode("email-bienvenida")({ json: { error: "quota" } }, prep, env)[0].json;
    expect(out.aiUsed).toBe(false);
    expect(out.email.html).toContain("Tres consejos para empezar");
  });
});

describe("rama 03: reseña negativa", () => {
  const review = (average, comment) => ({ json: { id: "evt-3", event: "review.created", occurredAt: "2026-09-04T10:00:00Z", data: { id: "rv1", restaurant: { id: "r1", slug: "casa-terral", name: "Casa Terral", ownerEmail: "lucia@casaterral.es" }, author: { id: "u2", name: "Iker M." }, ratings: { AMBIANCE: 2, SERVICE: 1, FOOD: 3, VALUE: 2 }, comment, average } } });

  it("preparar-respuesta detiene la rama si la media no es negativa", () => {
    const run = loadNode("preparar-respuesta");
    expect(run(review(4.5, "genial"))).toEqual([]);
    expect(run(review(3, "meh"))).toEqual([]);
    const out = run(review(2, "frío"));
    expect(out).toHaveLength(1);
    expect(out[0].json.geminiBody.generationConfig.responseMimeType).toBe("application/json");
  });

  it("email-resena con JSON de IA: borrador, categoría y sin escalado si no es grave", () => {
    const prep = review(2, "Esperamos 40 minutos");
    const out = loadNode("email-resena")(gemini('{"categoria":"espera","borrador":"Gracias por contárnoslo…"}'), prep, env)[0].json;
    expect(out).toMatchObject({ categoria: "espera", grave: false, aiUsed: true, telegramBody: null });
    expect(out.email.to).toBe("lucia@casaterral.es");
    expect(out.email.subject).toBe("Reseña con 2 sobre 5 en Casa Terral");
    expect(out.email.html).toContain("Gracias por contárnoslo…");
    expect(out.email.html).toContain("Servicio: <b>1</b>/5");
    expect(out.email.text).toContain("Esperamos 40 minutos\n"); // el comentario no se pega con el título siguiente
  });

  it("queja de alérgenos: escala al administrador por Telegram y marca el asunto", () => {
    const prep = review(1.5, "Dijeron que no llevaba gluten y llevaba");
    const out = loadNode("email-resena")(gemini('{"categoria":"Alérgenos","borrador":"Lo sentimos mucho…"}'), prep, env)[0].json;
    expect(out.categoria).toBe("alergenos");
    expect(out.grave).toBe(true);
    expect(out.email.subject.startsWith("[Atención]")).toBe(true);
    expect(out.telegramBody.chat_id).toBe("123456");
    expect(out.telegramBody.text).toContain("Reseña grave (alergenos)");
  });

  it("si la IA no devuelve JSON, usa el texto como borrador; si no hay IA, lo dice", () => {
    const prep = review(2, "mal");
    const plain = loadNode("email-resena")(gemini("Gracias por su visita, lamentamos…"), prep, env)[0].json;
    expect(plain.categoria).toBe("otro");
    expect(plain.email.html).toContain("Gracias por su visita");
    const none = loadNode("email-resena")({ json: { error: "quota" } }, prep, env)[0].json;
    expect(none.aiUsed).toBe(false);
    expect(none.email.html).toContain("No se ha podido generar un borrador");
  });
});

describe("nodo enviar-email", () => {
  const run = loadNode("enviar-email");
  const item = { json: { email: { to: "a@b.c", subject: "s", html: "<p>h</p>", text: "h" } } };

  it("omite sin fallar cuando falta SMTP o el destinatario", async () => {
    expect((await run(item, {}, null))[0].json.result).toContain("SMTP sin configurar");
    expect((await run({ json: {} }, {}, null))[0].json.result).toContain("sin destinatario");
    expect((await run(item, { SMTP_HOST: "h", SMTP_USER: "u", SMTP_PASSWORD: "p" }, null))[0].json.result).toContain("nodemailer no disponible");
  });

  it("envía con nodemailer usando las variables de entorno", async () => {
    const sent = [];
    const fake = { createTransport: (cfg) => ({ sendMail: async (msg) => (sent.push({ cfg, msg }), { messageId: "id-1" }) }) };
    const out = await run(item, { SMTP_HOST: "smtp.gmail.com", SMTP_PORT: "465", SMTP_USER: "u@gmail.com", SMTP_PASSWORD: "p", EMAIL_FROM: "Foodzinder <u@gmail.com>" }, fake);
    expect(out[0].json.result).toBe("enviado a a@b.c (id-1)");
    expect(sent[0].cfg).toMatchObject({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: "u@gmail.com", pass: "p" } });
    expect(sent[0].msg).toMatchObject({ from: "Foodzinder <u@gmail.com>", to: "a@b.c", subject: "s" });
  });
});
