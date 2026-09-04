// Rama 03, nodo "email-resena": correo al dueño con la reseña, el borrador de
// respuesta (o el texto completo si la IA no devolvió JSON) y, si la queja es
// grave (higiene o alérgenos), marca el escalado al administrador.
// @include shared/gemini
// @include shared/telegram
// @include shared/email

const GRAVES = ["higiene", "alergenos"];
const LABEL = { AMBIANCE: "Ambiente", SERVICE: "Servicio", FOOD: "Comida", VALUE: "Calidad/precio" };

function run(geminiItem, prepItem, env) {
  const p = prepItem.json;
  const rv = p.data || {};
  const base = (env.FOODZINDER_BASE_URL || "https://foodzinder.vercel.app").replace(/\/+$/, "");
  const parsed = parseGeminiJson(geminiItem && geminiItem.json);
  const texto = parseGeminiText(geminiItem && geminiItem.json);
  const categoria = (parsed && String(parsed.categoria || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")) || "otro";
  const borrador = (parsed && parsed.borrador) || texto || null;
  const grave = GRAVES.includes(categoria);

  const notas = Object.keys(LABEL).map((k) => `<li>${LABEL[k]}: <b>${escapeHtml(rv.ratings && rv.ratings[k] != null ? rv.ratings[k] : "-")}</b>/5</li>`).join("");
  const body = [
    `<p>${escapeHtml(rv.author && rv.author.name || "Un cliente")} ha dejado una reseña con media <b>${escapeHtml(rv.average)}</b> sobre 5 en <b>${escapeHtml(rv.restaurant && rv.restaurant.name)}</b>.</p>`,
    `<ul>${notas}</ul>`,
    rv.comment ? `<blockquote style="margin:12px 0;padding:10px 14px;border-left:3px solid #f67499;background:#fff5f8">${escapeHtml(rv.comment)}</blockquote>` : "<p>Sin comentario.</p>",
    borrador ? `<p><b>Borrador de respuesta pública</b> (edítalo a tu manera antes de publicarlo):</p><div style="padding:12px 14px;background:#f3f1ef;border-radius:8px;white-space:pre-wrap">${escapeHtml(borrador)}</div>` : "<p>No se ha podido generar un borrador de respuesta; responde con tus palabras: agradece, reconoce lo concreto y invita a volver.</p>",
    grave ? `<p style="color:#c62828"><b>Atención:</b> la queja habla de ${escapeHtml(categoria)}. Conviene revisarlo hoy mismo.</p>` : "",
    `<p><a href="${base}/restaurant/${rv.restaurant && rv.restaurant.slug}#resenas" style="color:#c9305f">Ver la reseña en la ficha</a></p>`,
  ].join("");
  const subject = `${grave ? "[Atención] " : ""}Reseña con ${rv.average} sobre 5 en ${rv.restaurant && rv.restaurant.name}`;
  const html = emailLayout("Una reseña que merece respuesta", body);

  const adminText = grave
    ? `⚠️ <b>Reseña grave (${escapeHtml(categoria)})</b> en <b>${escapeHtml(rv.restaurant && rv.restaurant.name)}</b>, media ${escapeHtml(rv.average)}/5\n${escapeHtml(String(rv.comment || "").slice(0, 300))}\n<a href="${base}/dashboard/admin/reviews">Moderar reseñas</a>`
    : null;

  return [{
    json: {
      ...p,
      action: "email-dueno",
      aiUsed: Boolean(borrador),
      categoria,
      grave,
      email: { to: rv.restaurant && rv.restaurant.ownerEmail, subject, html, text: htmlToText(html) },
      telegramBody: grave ? tgMessage(env.TELEGRAM_ADMIN_CHAT_ID, adminText) : null,
    },
  }];
}

return run($input.first(), $("preparar-respuesta").first(), $env); // @n8n-invoke
