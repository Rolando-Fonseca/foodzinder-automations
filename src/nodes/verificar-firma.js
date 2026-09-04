// Nodo Code "verificar-firma" (Run Once for All Items).
// Verifica X-Foodzinder-Signature (HMAC-SHA256 del cuerpo crudo) con
// FOODZINDER_WEBHOOK_SECRET. Si no cuadra, lanza: la ejecución queda en rojo
// y nada más se ejecuta. Requiere NODE_FUNCTION_ALLOW_BUILTIN=crypto.
function run(item, env, crypto) {
  const secret = env.FOODZINDER_WEBHOOK_SECRET;
  if (!secret) throw new Error("Falta FOODZINDER_WEBHOOK_SECRET en el entorno de n8n");

  const headers = item.json.headers || {};
  const signature = headers["x-foodzinder-signature"];
  if (!signature) throw new Error("Evento sin cabecera X-Foodzinder-Signature");

  // Con "Raw Body" el cuerpo llega en binary.data (base64); si no, se reserializa el JSON.
  const raw = item.binary && item.binary.data && item.binary.data.data
    ? Buffer.from(item.binary.data.data, "base64").toString("utf8")
    : JSON.stringify(item.json.body);

  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(String(signature), "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error("Firma inválida: el evento no viene de Foodzinder o el secreto no coincide");
  }

  const body = item.json.body && typeof item.json.body === "object" ? item.json.body : JSON.parse(raw);
  return [{ json: { ...body, _delivery: headers["x-foodzinder-delivery"] || null, _verified: true } }];
}

return run($input.first(), $env, require("crypto")); // @n8n-invoke
