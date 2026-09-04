// Flujo 04, nodo "mensaje-informe": con el texto de Gemini (o solo cifras si
// no respondió) compone el informe y lo trocea en mensajes de Telegram.
// Devuelve un item por mensaje: el nodo HTTP siguiente envía uno por item.
// @include shared/gemini
// @include shared/telegram

function run(geminiItem, prepItem, env) {
  const p = prepItem.json;
  const s = p.stats || {};
  const texto = parseGeminiText(geminiItem && geminiItem.json);
  const base = (env.FOODZINDER_BASE_URL || "https://foodzinder.vercel.app").replace(/\/+$/, "");
  const week = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "Europe/Madrid" });

  const cifras = s.users
    ? [
        `👥 Usuarios: ${s.users.total} (${s.users.new} nuevos, ${s.users.owners} dueños)`,
        `🍽 Restaurantes: ${s.restaurants.APPROVED} publicados · ${s.restaurants.PENDING} pendientes · ${s.restaurants.REJECTED} rechazados · ${s.restaurants.new} nuevos`,
        `⭐ Reseñas: ${s.reviews.new} nuevas de ${s.reviews.total} · media de la semana ${s.reviews.averageScore}`,
        `🔔 Webhooks: ${s.webhooks.delivered} entregados · ${s.webhooks.failed} fallidos`,
      ].join("\n")
    : "Sin estadísticas: la API no respondió.";

  const pendientes = p.pending && p.pending.length ? "\n\n<b>Pendientes de aprobar</b>\n" + p.pending.map((r) => `• ${escapeHtml(r.name)}${r.city ? ` (${escapeHtml(r.city)})` : ""} — <a href="${base}/dashboard/admin/restaurants/${r.id}">revisar</a>`).join("\n") : "";
  const aviso = p.missing && p.missing.length ? `\n\n⚠️ No se pudieron cargar: ${p.missing.join(", ")}.` : "";
  const cuerpo = texto ? `\n\n${escapeHtml(texto)}` : "\n\nSin redacción de IA esta semana; arriba van las cifras.";

  const full = `<b>Informe semanal Foodzinder · ${week}</b>\n\n${escapeHtml(cifras)}${cuerpo}${pendientes}${aviso}\n\n<a href="${base}/dashboard/admin">Abrir el panel</a>`;
  const chunks = splitTelegram(full, 4000);
  return chunks.map((text, i) => ({ json: { ...p, action: "telegram-informe", aiUsed: Boolean(texto), part: i + 1, parts: chunks.length, telegramBody: tgMessage(env.TELEGRAM_ADMIN_CHAT_ID, text) } }));
}

return run($input.first(), $("preparar-informe").first(), $env); // @n8n-invoke
