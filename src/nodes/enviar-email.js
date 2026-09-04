// Nodo "enviar-email": SMTP con nodemailer (viene con n8n) y variables de
// entorno, sin credenciales guardadas en el editor. Requiere
// NODE_FUNCTION_ALLOW_EXTERNAL=nodemailer. Si falta configuración SMTP, no
// falla: marca el envío como omitido para que el flujo termine y se vea por qué.
function buildTransportConfig(env) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) return null;
  const port = Number(env.SMTP_PORT || 465);
  return { host: env.SMTP_HOST, port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } };
}

function buildMessage(email, env) {
  return { from: env.EMAIL_FROM || env.SMTP_USER, to: email.to, subject: email.subject, text: email.text, html: email.html };
}

async function run(item, env, nodemailer) {
  const e = item.json;
  const email = e.email;
  if (!email || !email.to) return [{ json: { ...e, result: "omitido: sin destinatario" } }];
  const cfg = buildTransportConfig(env);
  if (!cfg) return [{ json: { ...e, result: "omitido: SMTP sin configurar (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)" } }];
  if (!nodemailer) return [{ json: { ...e, result: "omitido: nodemailer no disponible (NODE_FUNCTION_ALLOW_EXTERNAL=nodemailer)" } }];
  const transport = nodemailer.createTransport(cfg);
  const info = await transport.sendMail(buildMessage(email, env));
  return [{ json: { ...e, result: `enviado a ${email.to} (${info.messageId || "sin id"})` } }];
}

let mailer = null;
try {
  mailer = require("nodemailer");
} catch (err) {
  mailer = null;
}
return await run($input.first(), $env, mailer); // @n8n-invoke
