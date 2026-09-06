// Rama 03, nodo "preparar-respuesta": solo sigue si la reseña es negativa
// (media < 3). Devuelve [] en caso contrario, lo que detiene la rama.
// @include shared/gemini
// @include shared/prompts

function run(item) {
  const e = item.json;
  const review = e.data || {};
  const avg = Number(review.average);
  if (!(avg < 3)) return [];
  const instrucciones = promptRespuestaResena(review);
  return [{ json: { ...e, instrucciones, geminiBody: buildGeminiBody(instrucciones, { temperature: 0.5, maxOutputTokens: 500, json: true }) } }];
}

return run($input.first()); // @n8n-invoke
