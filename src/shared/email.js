// Compartido: plantilla HTML de los correos (sencilla, sin CSS externo) y texto plano.
// @exports emailLayout, htmlToText

function emailLayout(title, bodyHtml, footerHtml) {
  return [
    '<!doctype html><html lang="es"><body style="margin:0;background:#fbf6f1;font-family:Arial,Helvetica,sans-serif;color:#2d3436">',
    '<div style="max-width:560px;margin:0 auto;padding:32px 20px">',
    '<p style="margin:0 0 20px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#c9305f;font-weight:bold">Foodzinder</p>',
    `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">${title}</h1>`,
    `<div style="background:#fff;border:1px solid #e6e2de;border-radius:12px;padding:20px;font-size:15px;line-height:1.55">${bodyHtml}</div>`,
    `<p style="margin:20px 0 0;font-size:12px;color:#5b6470">${footerHtml || "Este correo lo envía una automatización de Foodzinder. Proyecto académico; los datos son de demostración."}</p>`,
    "</div></body></html>",
  ].join("");
}

function htmlToText(html) {
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h1|h2|h3|li|tr|blockquote|ul)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
