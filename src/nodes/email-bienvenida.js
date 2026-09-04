// Rama 02, nodo "email-bienvenida": correo al dueño con la URL pública y los
// consejos de Gemini (o unos genéricos si la IA no respondió).
// @include shared/gemini
// @include shared/telegram
// @include shared/email

function run(geminiItem, prepItem, env) {
  const p = prepItem.json;
  const r = p.ficha || p.data || {};
  const owner = (p.data && p.data.owner) || {};
  const base = (env.FOODZINDER_BASE_URL || "https://foodzinder.vercel.app").replace(/\/+$/, "");
  const publicUrl = (p.data && p.data.publicUrl) || `${base}/restaurant/${r.slug}`;
  const consejos = parseGeminiText(geminiItem && geminiItem.json);
  const fallback = "- Completa la carta con todos los platos y declara los alérgenos de cada uno: los usuarios filtran por ellos.\n- Añade una descripción corta y honesta de qué se come y cómo es el sitio.\n- Pide a tus primeros clientes que dejen una reseña; las fichas con reseñas reciben más visitas.";
  const lista = (consejos || fallback)
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean)
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("");

  const body = [
    `<p>Hola ${escapeHtml(owner.name || "")},</p>`,
    `<p><b>${escapeHtml(r.name)}</b> ya está publicado en Foodzinder. Esta es su ficha pública:</p>`,
    `<p><a href="${publicUrl}" style="color:#c9305f">${publicUrl}</a></p>`,
    `<p>${consejos ? "Tres cosas que harían la ficha más atractiva, según lo que hay publicado ahora mismo:" : "Tres consejos para empezar:"}</p>`,
    `<ul>${lista}</ul>`,
    `<p>Puedes editar la ficha, la carta y los platos desde <a href="${base}/dashboard/owner" style="color:#c9305f">tu panel</a>.</p>`,
  ].join("");
  const html = emailLayout(`${escapeHtml(r.name)} ya está en Foodzinder`, body);
  return [{
    json: {
      ...p,
      action: "email-bienvenida",
      aiUsed: Boolean(consejos),
      email: { to: owner.email, subject: `${r.name} ya está publicado en Foodzinder`, html, text: htmlToText(html) },
    },
  }];
}

return run($input.first(), $("preparar-consejos").first(), $env); // @n8n-invoke
