// Imprime, con sus valores, las variables que render.yaml marca como sync:false
// para copiarlas en el panel de Render al crear el Blueprint. Lee .env y
// N8N_NEON_URL. Solo para tu terminal: los valores son secretos.
import { readFileSync, existsSync } from "node:fs";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const neon = process.env.N8N_NEON_URL ? new URL(process.env.N8N_NEON_URL.trim().replace(/^["']|["']$/g, "")) : null;
const vars = {
  DB_POSTGRESDB_HOST: neon?.hostname,
  DB_POSTGRESDB_DATABASE: neon ? neon.pathname.replace(/^\//, "") : undefined,
  DB_POSTGRESDB_USER: neon ? decodeURIComponent(neon.username) : undefined,
  DB_POSTGRESDB_PASSWORD: neon ? decodeURIComponent(neon.password) : undefined,
  N8N_ENCRYPTION_KEY: process.env.N8N_ENCRYPTION_KEY,
  N8N_USER_MANAGEMENT_JWT_SECRET: process.env.N8N_USER_MANAGEMENT_JWT_SECRET,
  FOODZINDER_API_KEY: process.env.FOODZINDER_API_KEY,
  FOODZINDER_WEBHOOK_SECRET: process.env.FOODZINDER_WEBHOOK_SECRET,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
};
let missing = 0;
console.log("Pega cada valor en su variable en Render (New → Blueprint → foodzinder-automations):\n");
for (const [k, v] of Object.entries(vars)) {
  if (!v) {
    missing++;
    console.log(`${k}=   <-- FALTA en .env`);
  } else console.log(`${k}=${v}`);
}
console.log("\nEMAIL_FROM ya viene en render.yaml; si quieres tu Gmail como remitente, edítalo en Render:", process.env.EMAIL_FROM || "(sin definir)");
console.log("\nSi Render cambia el nombre del servicio (por ejemplo foodzinder-n8n-abcd), actualiza N8N_HOST y WEBHOOK_URL con esa URL.");
if (missing) process.exit(1);
