// Nodo Code "normalizar-evento". Valida la forma del sobre del contrato del P4
// y deja un objeto plano para el Switch y los flujos.
const EVENTS = [
  "user.created",
  "user.became_owner",
  "restaurant.created",
  "restaurant.resubmitted",
  "restaurant.approved",
  "restaurant.rejected",
  "menu.created",
  "review.created",
  "subscription.activated",
  "webhook.test",
];

function run(item) {
  const e = item.json;
  if (e.version !== 1) throw new Error(`Versión de evento no soportada: ${e.version}`);
  if (!e.id || !e.event || !e.occurredAt) throw new Error("Sobre incompleto: faltan id, event u occurredAt");
  if (!EVENTS.includes(e.event)) throw new Error(`Evento desconocido: ${e.event}`);
  return [
    {
      json: {
        id: e.id,
        event: e.event,
        occurredAt: e.occurredAt,
        delivery: e._delivery || null,
        data: e.data || {},
        known: true,
      },
    },
  ];
}

return run($input.first()); // @n8n-invoke
