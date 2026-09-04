// Comprobación estructural de workflows/*.json: nodos con nombre único, tipo y
// versión, conexiones que apuntan a nodos existentes, y ningún marcador
// {{code:...}} sin sustituir. No sustituye a importarlos en n8n, pero atrapa
// los errores tontos antes.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("../workflows", import.meta.url));
let errors = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const wf = JSON.parse(readFileSync(join(dir, file), "utf8"));
  const names = new Set();
  for (const n of wf.nodes ?? []) {
    if (!n.name || !n.type || !n.typeVersion) (errors++, console.error(`${file}: nodo sin nombre/tipo/versión: ${JSON.stringify(n).slice(0, 80)}`));
    if (names.has(n.name)) (errors++, console.error(`${file}: nombre de nodo repetido: ${n.name}`));
    names.add(n.name);
    if (typeof n.parameters?.jsCode === "string" && /\{\{code:/.test(n.parameters.jsCode)) (errors++, console.error(`${file}: marcador sin sustituir en ${n.name}`));
  }
  for (const [from, outs] of Object.entries(wf.connections ?? {})) {
    if (!names.has(from)) (errors++, console.error(`${file}: conexión desde nodo inexistente: ${from}`));
    for (const branch of outs.main ?? []) for (const c of branch ?? []) if (!names.has(c.node)) (errors++, console.error(`${file}: conexión hacia nodo inexistente: ${c.node}`));
  }
  const triggers = (wf.nodes ?? []).filter((n) => /webhook|trigger|cron|schedule/i.test(n.type));
  if (triggers.length === 0) (errors++, console.error(`${file}: sin nodo disparador`));
  console.log(`${errors ? "?" : "✓"} ${file}: ${wf.nodes.length} nodos, ${triggers.length} disparador(es)`);
}
process.exit(errors ? 1 : 0);
