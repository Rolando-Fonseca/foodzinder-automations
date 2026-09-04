// Flujo 01b, nodo "confirmar-accion": tras llamar a la API de Foodzinder
// (o fallar), prepara la edición del mensaje original y la respuesta al botón.
// @include shared/telegram

function run(apiItem, cbItem, now) {
  const cb = cbItem.json;
  const api = (apiItem && apiItem.json) || {};
  const ok = api.success === true;
  const when = (now || new Date()).toLocaleString("es-ES", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  const who = escapeHtml(cb.from || "administrador");
  let status;
  if (cb.action === "approve") status = ok ? `✅ <b>Aprobado</b> por ${who} a las ${when}. Ya está publicado.` : `⚠️ No se pudo aprobar: ${escapeHtml(api.error || "error desconocido")}`;
  else status = ok ? `❌ <b>Rechazado</b> por ${who} a las ${when}. Motivo: ${escapeHtml(cb.rejectReason || "")}` : `⚠️ No se pudo rechazar: ${escapeHtml(api.error || "error desconocido")}`;

  const original = cb.originalText ? escapeHtml(cb.originalText).split("\n").slice(0, 3).join("\n") : "";
  const edit = cb.messageId ? tgEditMessage(cb.chatId, cb.messageId, `${original}\n\n${status}`.trim()) : null;
  const answer = cb.callbackQueryId ? { callback_query_id: cb.callbackQueryId, text: ok ? "Hecho" : "Ha fallado, mira el mensaje" } : null;
  return [{ json: { ...cb, apiOk: ok, apiError: ok ? null : api.error || null, editBody: edit, answerBody: answer, result: ok ? "ok" : "fallo" } }];
}

return run($input.first(), $("parsear-callback").first(), new Date()); // @n8n-invoke
