// Nodo Code "registrar": última parada de cada rama. Deja una línea legible en
// la ejecución para auditar qué se hizo con cada evento. El evento se toma del
// nodo normalizar-evento (lo que llega aquí puede ser la respuesta de Telegram
// o del correo); acción y resultado, del último nodo si los trae.
function run(items, eventItem, now) {
  const e = (eventItem && eventItem.json) || {};
  const last = (items[0] && items[0].json) || {};
  const action = last.action || e.action || "sin acción";
  const result = last.result || (last.ok === true ? "telegram ok" : last.error ? `error: ${typeof last.error === "string" ? last.error : last.error.message || "desconocido"}` : "ok");
  const summary = `${e.event || "?"} ${e.id || "?"} -> ${action}: ${result}`;
  return [{ json: { event: e.event, id: e.id, action, result, aiUsed: last.aiUsed, summary, loggedAt: (now || new Date()).toISOString() } }];
}

return run($input.all(), $("normalizar-evento").first(), new Date()); // @n8n-invoke
