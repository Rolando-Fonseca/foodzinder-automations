import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** Sustituye `// @include shared/<x>` por el contenido de src/shared/<x>.js (mismo mecanismo que el build). */
export function expandIncludes(src) {
  return src.replace(/^\/\/ @include ([a-z0-9/_-]+)\s*$/gm, (_, name) => readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8"));
}

/**
 * Carga el código exacto de un nodo (src/nodes/<name>.js) sin las líneas de
 * invocación de n8n (marcadas con @n8n-invoke; si hay varias, todas las que
 * van desde la primera) y devuelve su función `run`.
 */
export function loadNode(name) {
  const src = expandIncludes(readFileSync(new URL(`../src/nodes/${name}.js`, import.meta.url), "utf8"));
  const lines = src.split("\n");
  const invokeAt = lines.findIndex((l) => l.includes("@n8n-invoke"));
  // La invocación puede ocupar varias líneas antes del marcador (evaluar-ping): cortamos en la primera línea de nivel superior que no sea función.
  let cut = invokeAt;
  while (cut > 0 && /^(const st = \$|const out = run|Object\.assign\(st|return out)/.test(lines[cut - 1])) cut--;
  const body = lines.slice(0, cut).join("\n");
  const factory = new Function("require", "Buffer", `${body}\nreturn run;`);
  return factory(require, Buffer);
}

/** Carga un fichero compartido y devuelve las funciones listadas en `// @exports a, b`. */
export function loadShared(name) {
  const src = readFileSync(new URL(`../src/shared/${name}.js`, import.meta.url), "utf8");
  const m = /\/\/ @exports (.+)/.exec(src);
  const names = m ? m[1].split(",").map((s) => s.trim()) : [];
  return new Function(`${src}\nreturn { ${names.join(", ")} };`)();
}

/** Item de n8n tal y como lo deja un Webhook Trigger con Raw Body activado. */
export function webhookItem(bodyString, headers = {}) {
  return {
    json: { headers, body: JSON.parse(bodyString), query: {} },
    binary: { data: { data: Buffer.from(bodyString, "utf8").toString("base64"), mimeType: "application/json" } },
  };
}
