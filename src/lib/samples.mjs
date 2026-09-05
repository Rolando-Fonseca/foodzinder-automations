// Cuerpos de ejemplo de cada evento, con la forma de docs/api.md del P4.
// Cuando hay red, toma un restaurante real de la API pública para que los
// enlaces de los mensajes funcionen; si no, usa datos fijos.

const FALLBACK = {
  id: "7f2573a0-d2b2-4246-b66b-98a67e70997e",
  slug: "casa-terral",
  name: "Casa Terral",
  city: "Madrid",
  status: "PENDING",
  priceRange: "MODERATE",
};

async function pickRestaurant(baseUrl, opts = {}) {
  // --pending: un restaurante realmente pendiente en Foodzinder (API privada), para que Aprobar/Rechazar tengan efecto real.
  if (opts.pending && process.env.FOODZINDER_API_KEY) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/admin/restaurants?status=PENDING`, { headers: { "x-api-key": process.env.FOODZINDER_API_KEY }, signal: AbortSignal.timeout(8000) });
      const json = await res.json();
      const r = json.data?.[0];
      if (r) return { id: r.id, slug: r.slug, name: r.name, city: r.city, status: "PENDING", priceRange: r.priceRange, description: r.description, phone: r.phone, website: r.website, cuisines: (r.taxonomies || []).map((t) => t.taxonomy?.name).filter(Boolean).map((name) => ({ name })), ownerEmail: r.owner?.email, ownerName: [r.owner?.firstName, r.owner?.lastName].filter(Boolean).join(" ") };
      console.error("(no hay restaurantes pendientes en Foodzinder; se usa uno publicado)");
    } catch (e) {
      console.error(`(no se pudo consultar la API privada: ${e.message})`);
    }
  }
  try {
    const res = await fetch(`${baseUrl}/api/v1/restaurants?limit=1&sort=recent`, { signal: AbortSignal.timeout(5000) });
    const json = await res.json();
    const r = json.data?.[0];
    return r ? { id: r.id, slug: r.slug, name: r.name, city: r.city, status: "PENDING", priceRange: r.priceRange } : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

export async function sampleEvent(event, opts = {}) {
  const baseUrl = opts.baseUrl || "https://foodzinder.vercel.app";
  const to = opts.to || "dueno@example.com";
  const r = await pickRestaurant(baseUrl, { pending: opts.pending });
  const owner = { id: "user_seed_owner_1", email: r.ownerEmail && !opts.to ? r.ownerEmail : to, name: r.ownerName || "Lucía Terral" };

  switch (event) {
    case "webhook.test":
      return { message: opts.comment || "Evento de prueba desde send-event.mjs", sentBy: "script" };
    case "user.created":
      return { id: "user_test_1", email: to, firstName: "Prueba", lastName: "Usuario", role: "USER" };
    case "user.became_owner":
      return { id: "user_test_1", email: to, firstName: "Prueba", lastName: "Dueño" };
    case "restaurant.created":
    case "restaurant.resubmitted":
      return { ...r, status: "PENDING", owner };
    case "restaurant.approved":
      return { ...r, status: "APPROVED", owner, publicUrl: `${baseUrl}/restaurant/${r.slug}` };
    case "restaurant.rejected":
      return { ...r, status: "REJECTED", owner, reason: opts.comment || "La dirección no coincide con las fotos" };
    case "menu.created":
      return { id: "menu-test-1", title: "Carta de prueba", ownerId: owner.id, restaurantIds: [r.id] };
    case "review.created": {
      const avg = opts.average ?? 2.3;
      const s = Math.max(1, Math.min(5, Math.round(avg)));
      return {
        id: "review-test-1",
        restaurant: { id: r.id, slug: r.slug, name: r.name, ownerEmail: to },
        author: { id: "user_seed_user_2", name: "Iker M." },
        ratings: { AMBIANCE: s, SERVICE: Math.max(1, s - 1), FOOD: Math.min(5, s + 1), VALUE: s },
        comment: opts.comment || "Esperamos 40 minutos y el plato llegó frío. El camarero fue amable, pero no volveremos.",
        average: avg,
      };
    }
    case "subscription.activated":
      return { id: "sub-test-1", userId: owner.id, plan: "pro", interval: "monthly", amount: 29.99, currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString() };
    default:
      throw new Error(`Evento desconocido: ${event}`);
  }
}
