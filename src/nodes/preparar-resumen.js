// Flujo 01, nodo "preparar-resumen": del evento restaurant.created/resubmitted
// construye el instrucciones y el cuerpo de la petición a Gemini.
// @include shared/gemini
// @include shared/prompts

function run(item) {
  const e = item.json;
  const r = e.data || {};
  const instrucciones = promptResumenRestaurante(r);
  return [{ json: { ...e, instrucciones, geminiBody: buildGeminiBody(instrucciones, { temperature: 0.2, maxOutputTokens: 300 }) } }];
}

return run($input.first()); // @n8n-invoke
