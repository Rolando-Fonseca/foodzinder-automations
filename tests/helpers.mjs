import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * Carga el código exacto de un nodo (src/nodes/<name>.js) sin la línea de
 * invocación de n8n (marcada con @n8n-invoke) y devuelve su función `run`.
 * Así los tests ejercitan el mismo código que se inyecta en los JSON.
 */
export function loadNode(name) {
  const src = readFileSync(new URL(`../src/nodes/${name}.js`, import.meta.url), "utf8");
  const body = src
    .split("\n")
    .filter((line) => !line.includes("@n8n-invoke"))
    .join("\n");
  const factory = new Function("require", "Buffer", `${body}\nreturn run;`);
  return factory(require, Buffer);
}

/** Item de n8n tal y como lo deja un Webhook Trigger con Raw Body activado. */
export function webhookItem(bodyString, headers = {}) {
  return {
    json: { headers, body: JSON.parse(bodyString), query: {} },
    binary: { data: { data: Buffer.from(bodyString, "utf8").toString("base64"), mimeType: "application/json" } },
  };
}
