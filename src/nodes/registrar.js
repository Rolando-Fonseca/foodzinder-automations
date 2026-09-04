// Nodo Code "registrar": última parada de cada rama. Deja una línea legible en
// la ejecución para auditar qué se hizo con cada evento.
function run(items, now) {
  return items.map((item) => {
    const e = item.json;
    const summary = `${e.event} ${e.id} -> ${e.action || "sin acción"}: ${e.result || "ok"}`;
    return { json: { ...e, summary, loggedAt: (now || new Date()).toISOString() } };
  });
}

return run($input.all(), new Date()); // @n8n-invoke
