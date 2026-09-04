// Genera workflows/*.json a partir de workflows/templates/*.json sustituyendo
// {{code:<nombre>}} en los nodos Code por el contenido de src/nodes/<nombre>.js.
// Con --check no escribe: falla si los JSON generados no están al día (CI).
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath: la carpeta del curso lleva tildes y espacios, y .pathname los deja codificados
const root = fileURLToPath(new URL("..", import.meta.url));
const templatesDir = join(root, "workflows", "templates");
const outDir = join(root, "workflows");
const nodesDir = join(root, "src", "nodes");
const check = process.argv.includes("--check");

const MARK = /^\{\{code:([a-z0-9-]+)\}\}$/;

function inject(obj, used) {
  if (Array.isArray(obj)) return obj.map((v) => inject(v, used));
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "jsCode" && typeof v === "string" && MARK.test(v)) {
        const name = v.match(MARK)[1];
        const file = join(nodesDir, `${name}.js`);
        if (!existsSync(file)) throw new Error(`No existe src/nodes/${name}.js (usado en un nodo Code)`);
        obj[k] = readFileSync(file, "utf8").replace(/\r\n/g, "\n").trimEnd() + "\n";
        used.add(name);
      } else obj[k] = inject(v, used);
    }
  }
  return obj;
}

let stale = 0;
const used = new Set();
for (const file of readdirSync(templatesDir).filter((f) => f.endsWith(".json"))) {
  const template = JSON.parse(readFileSync(join(templatesDir, file), "utf8"));
  const built = JSON.stringify(inject(template, used), null, 2) + "\n";
  const target = join(outDir, file);
  const current = existsSync(target) ? readFileSync(target, "utf8").replace(/\r\n/g, "\n") : null;
  if (current === built) {
    console.log(`= ${file}`);
    continue;
  }
  if (check) {
    console.error(`! ${file} desactualizado: ejecuta npm run build`);
    stale++;
  } else {
    writeFileSync(target, built);
    console.log(`+ ${file}`);
  }
}
const orphans = readdirSync(nodesDir).filter((f) => f.endsWith(".js") && !used.has(f.replace(/\.js$/, "")));
if (orphans.length) console.log(`  (nodos sin usar todavía: ${orphans.join(", ")})`);
if (stale) process.exit(1);
