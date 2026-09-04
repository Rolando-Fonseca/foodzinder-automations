// Flujo 01b, nodo "parsear-callback": de la actualización de Telegram (webhook
// del bot) saca acción e id, y comprueba que quien pulsa es el administrador.
// Rechazar con motivo: el admin responde al mensaje del bot con el texto; ese
// mensaje llega como `message` con reply_to_message.
function run(item, env) {
  const u = item.json.body || item.json;
  const admin = String(env.TELEGRAM_ADMIN_CHAT_ID || "");

  if (u.callback_query) {
    const cq = u.callback_query;
    const chatId = String(cq.message && cq.message.chat && cq.message.chat.id);
    const m = /^(approve|reject):([0-9a-f-]{36})$/.exec(cq.data || "");
    return [{
      json: {
        kind: "callback",
        valid: chatId === admin && Boolean(m),
        reason: chatId !== admin ? "chat no autorizado" : !m ? "callback_data desconocido" : null,
        action: m ? m[1] : null,
        restaurantId: m ? m[2] : null,
        chatId,
        messageId: cq.message && cq.message.message_id,
        callbackQueryId: cq.id,
        from: cq.from && (cq.from.first_name || cq.from.username),
        originalText: cq.message && cq.message.text,
      },
    }];
  }

  if (u.message && u.message.reply_to_message) {
    const msg = u.message;
    const chatId = String(msg.chat && msg.chat.id);
    const replied = msg.reply_to_message.text || "";
    const m = /Motivo de rechazo para ([0-9a-f-]{36})/.exec(replied);
    const reason = String(msg.text || "").trim();
    return [{
      json: {
        kind: "reject-reason",
        valid: chatId === admin && Boolean(m) && reason.length >= 10,
        reason: chatId !== admin ? "chat no autorizado" : !m ? "respuesta a un mensaje que no pide motivo" : reason.length < 10 ? "motivo demasiado corto (mínimo 10 caracteres)" : null,
        action: "reject",
        restaurantId: m ? m[1] : null,
        rejectReason: reason,
        chatId,
        messageId: msg.message_id,
        from: msg.from && (msg.from.first_name || msg.from.username),
      },
    }];
  }

  return [{ json: { kind: "ignored", valid: false, reason: "actualización sin callback ni respuesta", chatId: null } }];
}

return run($input.first(), $env); // @n8n-invoke
