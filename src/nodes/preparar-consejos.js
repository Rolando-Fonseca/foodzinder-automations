// Rama 02, nodo "preparar-consejos": con la ficha pública (respuesta de
// GET /api/v1/restaurants/{slug}) y el evento restaurant.approved, construye el
// instrucciones de consejos. Si la ficha no llegó (API caída), usa lo del evento.
// @include shared/gemini
// @include shared/prompts

function run(fichaItem, eventItem) {
  const e = eventItem.json;
  const ficha = fichaItem && fichaItem.json && fichaItem.json.success ? fichaItem.json.data : null;
  const r = ficha || { ...e.data, menus: [] };
  const instrucciones = promptConsejosDueno(r);
  return [{ json: { ...e, ficha: r, instrucciones, geminiBody: buildGeminiBody(instrucciones, { temperature: 0.4, maxOutputTokens: 400 }) } }];
}

return run($input.first(), $("normalizar-evento").first()); // @n8n-invoke
