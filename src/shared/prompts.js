// Compartido: prompts para Gemini. Misma estructura en todos: rol y tarea,
// datos delimitados con la orden de no inventar, formato cerrado.
// @exports promptResumenRestaurante, promptConsejosDueno, promptRespuestaResena, promptInformeSemanal

const REGLAS = "Responde en español de España, sin saludos ni despedidas. Usa solo los datos proporcionados; si un dato falta, dilo, no lo inventes.";

function promptResumenRestaurante(r) {
  const cocinas = (r.cuisines || []).map((c) => c.name || c).join(", ") || "sin indicar";
  return [
    "Eres el asistente del administrador de Foodzinder, un directorio de restaurantes. Un dueño acaba de dar de alta un restaurante y el administrador debe decidir si aprobarlo.",
    REGLAS,
    "DATOS DEL RESTAURANTE:",
    `- Nombre: ${r.name || "sin indicar"}`,
    `- Ciudad: ${r.city || "sin indicar"}`,
    `- Cocina: ${cocinas}`,
    `- Rango de precio: ${r.priceRange || "sin indicar"}`,
    `- Teléfono: ${r.phone || "sin indicar"}`,
    `- Web: ${r.website || "sin indicar"}`,
    `- Descripción: ${r.description ? `"${r.description}"` : "sin descripción"}`,
    `- Dueño: ${(r.owner && (r.owner.name || r.owner.email)) || "sin indicar"}`,
    "TAREA: escribe (1) un resumen de dos frases de qué restaurante es, y (2) una lista de los datos que faltan o parecen incompletos para publicarlo (máximo cuatro puntos, cada uno de una línea). Si no falta nada relevante, escribe 'Nada relevante que corregir'.",
    "FORMATO: primero el resumen, luego una línea en blanco, luego la lista con guiones. Máximo 90 palabras en total.",
  ].join("\n");
}

function promptConsejosDueno(r) {
  const platos = [];
  for (const m of r.menus || []) for (const c of m.categories || []) for (const d of c.dishes || []) platos.push(`${d.name} (${(d.allergens || []).map((a) => a.name).join(", ") || "sin alérgenos declarados"})`);
  return [
    "Eres el asistente de Foodzinder y escribes al dueño de un restaurante que acaba de ser publicado en el directorio.",
    REGLAS,
    "DATOS:",
    `- Restaurante: ${r.name}, ${r.city || "ciudad sin indicar"}`,
    `- Descripción: ${r.description ? `"${r.description}"` : "sin descripción"}`,
    `- Foto de portada: ${r.coverUrl ? "sí" : "no"}`,
    `- Cartas: ${(r.menus || []).length}`,
    `- Platos (con alérgenos declarados): ${platos.length ? platos.slice(0, 40).join("; ") : "ninguno"}`,
    "TAREA: escribe tres consejos concretos y accionables para que la ficha atraiga más clientes, basados solo en lo que falta o flojea en estos datos (por ejemplo: platos sin alérgenos declarados, sin descripción, sin foto, carta vacía, pocas categorías). Si todo está completo, felicita y sugiere pedir reseñas a los primeros clientes.",
    "FORMATO: tres puntos con guion, cada uno de una o dos frases, en tono cercano y directo. Máximo 120 palabras.",
  ].join("\n");
}

function promptRespuestaResena(review) {
  const r = review.ratings || {};
  return [
    "Eres el asistente del dueño de un restaurante. Un cliente ha dejado una reseña negativa y el dueño quiere responder en público.",
    REGLAS,
    "RESEÑA:",
    `- Restaurante: ${review.restaurant && review.restaurant.name}`,
    `- Autor: ${review.author && review.author.name}`,
    `- Notas sobre 5: ambiente ${r.AMBIANCE}, servicio ${r.SERVICE}, comida ${r.FOOD}, calidad/precio ${r.VALUE} (media ${review.average})`,
    `- Comentario: ${review.comment ? `"${review.comment}"` : "sin comentario"}`,
    "TAREA: (1) clasifica la queja principal en una de estas categorías: higiene, alergenos, trato, espera, comida, precio, otro. (2) Redacta un borrador de respuesta pública del dueño: agradece, reconoce lo concreto que se menciona sin excusas largas, no prometas lo que no se puede cumplir, invita a volver. Sin nombres de empleados. Entre 50 y 90 palabras.",
    'FORMATO: JSON con exactamente estas claves: {"categoria": "...", "borrador": "..."}. Sin texto fuera del JSON.',
  ].join("\n");
}

function promptInformeSemanal(stats, reviews, pending) {
  const top = (reviews || []).slice().sort((a, b) => b.average - a.average);
  const line = (rv) => `${rv.restaurant && rv.restaurant.name}: ${rv.average}/5${rv.comment ? ` "${String(rv.comment).slice(0, 120)}"` : ""}`;
  const s = stats || {};
  return [
    "Eres el asistente del administrador de Foodzinder y redactas el informe semanal.",
    REGLAS,
    "CIFRAS DE LA SEMANA:",
    `- Usuarios: ${s.users && s.users.total} en total, ${s.users && s.users.new} nuevos, ${s.users && s.users.owners} dueños`,
    `- Restaurantes: ${s.restaurants && s.restaurants.APPROVED} publicados, ${s.restaurants && s.restaurants.PENDING} pendientes, ${s.restaurants && s.restaurants.REJECTED} rechazados, ${s.restaurants && s.restaurants.new} nuevos esta semana`,
    `- Reseñas: ${s.reviews && s.reviews.new} nuevas (${s.reviews && s.reviews.total} en total), nota media de la semana ${s.reviews && s.reviews.averageScore}`,
    `- Webhooks: ${s.webhooks && s.webhooks.delivered} entregados, ${s.webhooks && s.webhooks.failed} fallidos`,
    `- Pendientes de aprobación: ${(pending || []).map((p) => p.name).join(", ") || "ninguno"}`,
    `MEJORES RESEÑAS: ${top.slice(0, 3).map(line).join(" | ") || "ninguna"}`,
    `PEORES RESEÑAS: ${top.slice(-3).reverse().map(line).join(" | ") || "ninguna"}`,
    "TAREA: escribe tres párrafos cortos (qué ha pasado, qué destaca para bien y para mal, qué conviene revisar) y termina con una lista 'Esta semana toca:' de dos a cuatro acciones concretas para el administrador.",
    "FORMATO: texto plano, sin Markdown, máximo 220 palabras.",
  ].join("\n");
}
