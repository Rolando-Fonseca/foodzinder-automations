// Envía un correo de prueba con la configuración SMTP_* del .env, con la
// misma lógica que el nodo enviar-email (nodemailer viene con n8n; aquí se usa
// el del contenedor para no añadir dependencias al repo).
// Uso: node scripts/send-test-email.mjs destinatario@correo.com
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const to = process.argv[2];
if (!to) {
  console.error("Uso: node scripts/send-test-email.mjs destinatario@correo.com");
  process.exit(2);
}
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = process.env;
if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
  console.error("Faltan SMTP_HOST, SMTP_USER o SMTP_PASSWORD en .env");
  process.exit(2);
}
if (/\s/.test(SMTP_PASSWORD)) console.error("Aviso: SMTP_PASSWORD contiene espacios; la contraseña de aplicación va en 16 letras seguidas.");

// Se ejecuta dentro del contenedor de n8n, que ya trae nodemailer.
const script = `
const nodemailer = require("nodemailer");
const port = Number(process.env.SMTP_PORT || 465);
const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } });
t.sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to: process.argv[1], subject: "Prueba SMTP de Foodzinder Automations", text: "Si lees esto, n8n puede enviar correo con esta cuenta." })
  .then((i) => { console.log("Enviado:", i.messageId, "| respuesta del servidor:", i.response); })
  .catch((e) => { console.error("Fallo SMTP:", e.message); process.exit(1); });
`;
try {
  // nodemailer vive dentro del paquete n8n (pnpm); Node lo resuelve si se ejecuta desde ese directorio.
  const out = execFileSync("docker", ["compose", "exec", "-T", "-e", `SMTP_HOST=${SMTP_HOST}`, "-e", `SMTP_PORT=${SMTP_PORT || 465}`, "-e", `SMTP_USER=${SMTP_USER}`, "-e", `SMTP_PASSWORD=${SMTP_PASSWORD}`, "-e", `EMAIL_FROM=${EMAIL_FROM || ""}`, "-w", "/usr/local/lib/node_modules/n8n", "n8n", "node", "-e", script, to], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  console.log(out.trim());
} catch (e) {
  console.error((e.stderr || e.message || "").toString().trim());
  process.exit(1);
}
