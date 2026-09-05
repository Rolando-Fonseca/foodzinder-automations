// Registra (o borra) el webhook del bot de Telegram apuntando al flujo 01b.
// Uso: node scripts/telegram-set-webhook.mjs [--url https://…/webhook/telegram] [--delete] [--info]
// Sin --url usa WEBHOOK_URL del .env + "webhook/telegram" (en local necesita un túnel público).
import { readFileSync, existsSync } from "node:fs";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Falta TELEGRAM_BOT_TOKEN en .env");
  process.exit(2);
}
const args = process.argv.slice(2);
const api = (method, body) => fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }).then((r) => r.json());

if (args.includes("--info")) {
  console.log(JSON.stringify(await api("getWebhookInfo"), null, 2));
  process.exit(0);
}
if (args.includes("--chat-id")) {
  // Lista los chats que han escrito al bot (sirve para obtener TELEGRAM_ADMIN_CHAT_ID).
  // Solo funciona si el bot NO tiene webhook registrado; si lo tiene, se avisa.
  const info = await api("getWebhookInfo");
  if (info.result && info.result.url) {
    console.error(`El bot tiene un webhook (${info.result.url}); Telegram no entrega getUpdates. Ejecuta antes --delete.`);
    process.exit(2);
  }
  const me = await api("getMe");
  console.log(`Bot: @${me.result?.username} (${me.result?.first_name})`);
  const upd = await api("getUpdates", { limit: 50 });
  const chats = new Map();
  for (const u of upd.result || []) {
    const m = u.message || u.edited_message || (u.callback_query && u.callback_query.message);
    if (m && m.chat) chats.set(m.chat.id, `${m.chat.first_name || ""} ${m.chat.last_name || ""} ${m.chat.username ? "@" + m.chat.username : ""}`.trim());
  }
  if (!chats.size) console.log("Nadie ha escrito al bot todavía. Abre el chat con el bot en Telegram, pulsa Iniciar y escribe «hola»; luego repite este comando.");
  for (const [id, who] of chats) console.log(`TELEGRAM_ADMIN_CHAT_ID=${id}   # ${who}`);
  process.exit(0);
}
if (args.includes("--delete")) {
  console.log(JSON.stringify(await api("deleteWebhook", { drop_pending_updates: true })));
  process.exit(0);
}
const i = args.indexOf("--url");
const url = i >= 0 ? args[i + 1] : `${(process.env.WEBHOOK_URL || "").replace(/\/+$/, "")}/webhook/telegram`;
if (!/^https:\/\//.test(url)) {
  console.error(`Telegram exige https. URL: ${url}. En local, abre un túnel (npx cloudflared tunnel --url http://localhost:5679) y pásalo con --url.`);
  process.exit(2);
}
const res = await api("setWebhook", { url, allowed_updates: ["message", "callback_query"], drop_pending_updates: true });
console.log(JSON.stringify(res));
process.exit(res.ok ? 0 : 1);
