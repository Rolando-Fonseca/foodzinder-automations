// Flujo 01, nodo "preparar-resumen": del evento restaurant.created/resubmitted
// construye el prompt y el cuerpo de la petición a Gemini.
// @include shared/gemini
// @include shared/prompts

function run(item) {
  const e = item.json;
  const r = e.data || {};
  const prompt = promptResumenRestaurante(r);
  return [{ json: { ...e, prompt, geminiBody: buildGeminiRequest(prompt, { temperature: 0.2, maxOutputTokens: 300 }) } }];
}

return run($input.first()); // @n8n-invoke
