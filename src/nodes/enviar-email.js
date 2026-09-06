// Nodo "enviar-email". Dos transportes, elegidos con EMAIL_TRANSPORT:
//  - "smtp" (por defecto): nodemailer (viene con n8n) con las variables SMTP_*.
//    Requiere NODE_FUNCTION_ALLOW_EXTERNAL=nodemailer. Funciona en local.
//  - "foodzinder": el plan gratuito de Render bloquea el SMTP saliente, así que
//    n8n compone el correo y lo envía por el relevo POST /api/v1/admin/email
//    de Foodzinder (Vercel), con la clave FOODZINDER_API_KEY.
// Si falta configuración, no falla: deja el envío como omitido y el motivo.
function buildTransportConfig(env) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) return null;
  const port = Number(env.SMTP_PORT || 465);
  return { host: env.SMTP_HOST, port, secure: port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } };
}

function buildMessage(email, env) {
  return { from: env.EMAIL_FROM || env.SMTP_USER, to: email.to, subject: email.subject, text: email.text, html: email.html };
}

async function sendViaFoodzinder(email, env, fetchImpl) {
  const base = (env.FOODZINDER_BASE_URL || "https://foodzinder.vercel.app").replace(/\/+$/, "");
  if (!env.FOODZINDER_API_KEY) return "omitido: falta FOODZINDER_API_KEY para el relevo de correo";
  const res = await fetchImpl(`${base}/api/v1/admin/email`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.FOODZINDER_API_KEY },
    body: JSON.stringify({ to: email.to, subject: email.subject, html: email.html, text: email.text }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) return `fallo relevo (${res.status}): ${(json && json.error) || "sin detalle"}`;
  return `enviado a ${email.to} vía Foodzinder (${(json.data && json.data.messageId) || "sin id"})`;
}

async function run(item, env, nodemailer, fetchImpl) {
  const e = item.json;
  const email = e.email;
  if (!email || !email.to) return [{ json: { ...e, result: "omitido: sin destinatario" } }];

  if ((env.EMAIL_TRANSPORT || "smtp") === "foodzinder") {
    return [{ json: { ...e, result: await sendViaFoodzinder(email, env, fetchImpl) } }];
  }
  const cfg = buildTransportConfig(env);
  if (!cfg) return [{ json: { ...e, result: "omitido: SMTP sin configurar (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)" } }];
  if (!nodemailer) return [{ json: { ...e, result: "omitido: nodemailer no disponible (NODE_FUNCTION_ALLOW_EXTERNAL=nodemailer)" } }];
  const transport = nodemailer.createTransport(cfg);
  const info = await transport.sendMail(buildMessage(email, env));
  return [{ json: { ...e, result: `enviado a ${email.to} (${info.messageId || "sin id"})` } }];
}

// El sandbox del nodo Code no expone fetch; this.helpers.httpRequest sí existe.
// Adaptador con la misma forma mínima de Response que usa sendViaFoodzinder.
function fetchConHelpers(helpers) {
  return async (url, init) => {
    try {
      const res = await helpers.httpRequest({ method: init.method, url, headers: init.headers, body: JSON.parse(init.body), json: true, returnFullResponse: true });
      return { ok: true, status: res.statusCode, json: async () => res.body };
    } catch (err) {
      const status = Number(err.httpCode) || 0;
      return { ok: false, status, json: async () => ({ error: err.description || err.message }) };
    }
  };
}

let mailer = null;
try {
  mailer = require("nodemailer");
} catch (err) {
  mailer = null;
}
return await run($input.first(), $env, mailer, typeof fetch === "function" ? fetch : fetchConHelpers(this.helpers)); // @n8n-invoke
