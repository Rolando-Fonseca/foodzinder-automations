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
