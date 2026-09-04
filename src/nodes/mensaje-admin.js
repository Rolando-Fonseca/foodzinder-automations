// Flujo 01, nodo "mensaje-admin": con la respuesta de Gemini (o sin ella) y el
// evento original, construye el mensaje de Telegram con botones Aprobar/Rechazar.
// @include shared/gemini
// @include shared/telegram

function run(geminiItem, eventItem, env) {
  const e = eventItem.json;
  const r = e.data || {};
  const resumen = parseGeminiText(geminiItem && geminiItem.json);
  const base = (env.FOODZINDER_BASE_URL || "https://foodzinder.vercel.app").replace(/\/+$/, "");
  const reenvio = e.event === "restaurant.resubmitted";
  const cocinas = (r.cuisines || []).map((c) => c.name || c).join(", ");

  const lines = [
    `<b>${reenvio ? "Restaurante reenviado tras rechazo" : "Nuevo restaurante pendiente"}</b>`,
    `<b>${escapeHtml(r.name)}</b>${r.city ? ` · ${escapeHtml(r.city)}` : ""}${cocinas ? ` · ${escapeHtml(cocinas)}` : ""}`,
    `Dueño: ${escapeHtml((r.owner && (r.owner.name || r.owner.email)) || "sin indicar")}${r.owner && r.owner.email ? ` (${escapeHtml(r.owner.email)})` : ""}`,
    "",
    resumen ? escapeHtml(resumen) : `Sin resumen de IA. Precio: ${escapeHtml(r.priceRange || "sin indicar")}. ${r.description ? escapeHtml(String(r.description).slice(0, 300)) : "Sin descripción."}`,
    "",
    `<a href="${base}/dashboard/admin/restaurants/${r.id}">Ver ficha en el panel</a>`,
  ];
  const text = lines.join("\n");
  const buttons = [[{ text: "✅ Aprobar", data: `approve:${r.id}` }, { text: "❌ Rechazar", data: `reject:${r.id}` }]];
  return [{ json: { ...e, action: "telegram-admin", aiUsed: Boolean(resumen), telegramBody: tgMessage(env.TELEGRAM_ADMIN_CHAT_ID, text, buttons) } }];
}

return run($input.first(), $("preparar-resumen").first(), $env); // @n8n-invoke
