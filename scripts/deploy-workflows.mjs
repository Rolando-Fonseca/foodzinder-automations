// Sube workflows/*.json a un n8n por su API pública (crea o actualiza por
// nombre) y los activa. Uso:
//   node scripts/deploy-workflows.mjs            # usa N8N_PUBLIC_URL y N8N_PUBLIC_API_KEY del .env
//   node scripts/deploy-workflows.mjs --url https://… --key n8n_api_…
//   node scripts/deploy-workflows.mjs --no-activate
// La API key se crea en el editor de n8n: Settings → n8n API → Create API key.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const args = process.argv.slice(2);
const flag = (n) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : undefined);
const base = (flag("url") || process.env.N8N_PUBLIC_URL || "").replace(/\/+$/, "");
const key = flag("key") || process.env.N8N_PUBLIC_API_KEY;
const activate = !args.includes("--no-activate");
if (!base || !key) {
  console.error("Faltan N8N_PUBLIC_URL o N8N_PUBLIC_API_KEY (en .env o con --url/--key).");
  process.exit(2);
}

const api = async (method, path, body) => {
  const res = await fetch(`${base}/api/v1${path}`, { method, headers: { "X-N8N-API-KEY": key, "content-type": "application/json", accept: "application/json" }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(60000) });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${(json.message || json.raw || "").toString().slice(0, 200)}`);
  return json;
};

// Campos que la API acepta al crear/actualizar (el resto los rechaza)
const clean = (wf) => ({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings || {}, staticData: wf.staticData || null });

const dir = fileURLToPath(new URL("../workflows", import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
console.log(`n8n: ${base}`);
const existing = (await api("GET", "/workflows?limit=250")).data || [];
for (const file of files) {
  const wf = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const found = existing.find((w) => w.name === wf.name);
  let id;
  if (found) {
    await api("PUT", `/workflows/${found.id}`, clean(wf));
    id = found.id;
    console.log(`= ${wf.name} (actualizado, ${id})`);
  } else {
    const created = await api("POST", "/workflows", clean(wf));
    id = created.id;
    console.log(`+ ${wf.name} (creado, ${id})`);
  }
  if (activate) {
    try {
      await api("POST", `/workflows/${id}/activate`);
      console.log(`  ✓ activo`);
    } catch (e) {
      console.log(`  ! no se pudo activar: ${e.message}`);
    }
  }
}
console.log("\nListo. Comprueba en el editor que los cinco flujos aparecen activos (interruptor verde).");
