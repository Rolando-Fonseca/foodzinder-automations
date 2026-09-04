// Flujo 04, nodo "preparar-informe": junta estadísticas, reseñas de la semana
// y pendientes (tres llamadas a la API privada) y construye el prompt.
// Si alguna llamada falló, sigue con lo que hay y lo dice en el informe.
// @include shared/gemini
// @include shared/prompts

function run(statsItem, reviewsItem, pendingItem) {
  const stats = statsItem && statsItem.json && statsItem.json.success ? statsItem.json.data : null;
  const reviews = reviewsItem && reviewsItem.json && reviewsItem.json.success ? reviewsItem.json.data || [] : [];
  const pending = pendingItem && pendingItem.json && pendingItem.json.success ? pendingItem.json.data || [] : [];
  const missing = [!stats && "estadísticas", !(reviewsItem && reviewsItem.json && reviewsItem.json.success) && "reseñas", !(pendingItem && pendingItem.json && pendingItem.json.success) && "pendientes"].filter(Boolean);

  const prompt = promptInformeSemanal(stats || {}, reviews, pending);
  return [{
    json: {
      event: "informe.semanal",
      id: `informe-${new Date().toISOString().slice(0, 10)}`,
      stats,
      reviewsCount: reviews.length,
      pending: pending.map((p) => ({ id: p.id, name: p.name, city: p.city, owner: p.owner && p.owner.email })),
      missing,
      prompt,
      geminiBody: buildGeminiRequest(prompt, { temperature: 0.3, maxOutputTokens: 700 }),
    },
  }];
}

return run($("api-stats").first(), $("api-reviews").first(), $("api-pendientes").first()); // @n8n-invoke
