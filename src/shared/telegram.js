// Compartido: cuerpos para la Bot API de Telegram (parse_mode HTML).
// @exports escapeHtml, tgMessage, tgEditMessage, splitTelegram

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Cuerpo de sendMessage. buttons: [[{text, data}]] → teclado inline. */
function tgMessage(chatId, html, buttons) {
  const body = { chat_id: chatId, text: html, parse_mode: "HTML", disable_web_page_preview: true };
  if (buttons && buttons.length) {
    body.reply_markup = { inline_keyboard: buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) };
  }
  return body;
}

/** Cuerpo de editMessageText (quita los botones al confirmar una acción). */
function tgEditMessage(chatId, messageId, html) {
  return { chat_id: chatId, message_id: messageId, text: html, parse_mode: "HTML", disable_web_page_preview: true, reply_markup: { inline_keyboard: [] } };
}

/** Telegram limita a 4096 caracteres: parte por párrafos. */
function splitTelegram(text, max) {
  const limit = max || 4000;
  if (text.length <= limit) return [text];
  const chunks = [];
  let current = "";
  for (const para of text.split(/\n\n+/)) {
    if ((current + "\n\n" + para).length > limit && current) {
      chunks.push(current);
      current = para;
    } else current = current ? current + "\n\n" + para : para;
  }
  if (current) chunks.push(current);
  return chunks.flatMap((c) => (c.length <= limit ? [c] : c.match(new RegExp(`[\\s\\S]{1,${limit}}`, "g"))));
}
