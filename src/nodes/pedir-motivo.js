// Flujo 01b, nodo "pedir-motivo": el admin ha pulsado Rechazar; se le pide el
// motivo respondiendo a un mensaje que lleva el id (así la respuesta se puede
// asociar sin estado).
// @include shared/telegram

function run(cbItem) {
  const cb = cbItem.json;
  const text = `Motivo de rechazo para ${cb.restaurantId}\n\nResponde a este mensaje con el motivo (mínimo 10 caracteres). El dueño lo recibirá tal cual.`;
  return [{
    json: {
      ...cb,
      askBody: { chat_id: cb.chatId, text, reply_markup: { force_reply: true, selective: true } },
      answerBody: cb.callbackQueryId ? { callback_query_id: cb.callbackQueryId, text: "Escribe el motivo" } : null,
    },
  }];
}

return run($input.first()); // @n8n-invoke
