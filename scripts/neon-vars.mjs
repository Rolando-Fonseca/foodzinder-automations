// Trocea N8N_NEON_URL (cadena de conexión de Neon para la base de n8n) en las
// variables DB_POSTGRESDB_* que pide Render, y comprueba que la base responde
// usando el psql del contenedor de Postgres local. No imprime la contraseña
// completa salvo con --show-password.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const envPath = new URL("../.env", import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(#.*)?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const raw = (process.env.N8N_NEON_URL || "").trim().replace(/^["']|["']$/g, "");
if (!raw) {
  console.error("Falta N8N_NEON_URL en .env (la cadena postgresql://… de Neon para la base n8n, sin pooling).");
  process.exit(2);
}
let u;
try {
  u = new URL(raw);
} catch {
  console.error("N8N_NEON_URL no es una URL válida. Debe empezar por postgresql:// y no llevar espacios ni comillas.");
  process.exit(2);
}
const host = u.hostname;
const database = u.pathname.replace(/^\//, "") || "n8n";
const user = decodeURIComponent(u.username);
const password = decodeURIComponent(u.password);
const show = process.argv.includes("--show-password");
const warnings = [];
if (host.includes("-pooler")) warnings.push("El host lleva -pooler: en Neon, desactiva Connection pooling y copia la cadena otra vez (n8n usa su propio pool).");
if (database !== "n8n") warnings.push(`La base de datos de la cadena es "${database}", no "n8n": elige n8n en el desplegable Database antes de copiar.`);
if (!u.searchParams.get("sslmode")) warnings.push("La cadena no lleva sslmode=require; Render ya activa SSL con DB_POSTGRESDB_SSL_ENABLED=true, así que no es grave.");

console.log("Variables para Render (New → Blueprint → foodzinder-automations):\n");
console.log(`DB_POSTGRESDB_HOST=${host}`);
console.log(`DB_POSTGRESDB_DATABASE=${database}`);
console.log(`DB_POSTGRESDB_USER=${user}`);
console.log(`DB_POSTGRESDB_PASSWORD=${show ? password : password.slice(0, 4) + "…" + password.slice(-2) + "   (completa con --show-password)"}`);
console.log(`DB_POSTGRESDB_PORT=${u.port || 5432}`);
for (const w of warnings) console.log(`\n! ${w}`);

console.log("\nComprobando conexión desde el contenedor de Postgres…");
try {
  const out = execFileSync("docker", ["compose", "exec", "-T", "postgres", "psql", raw, "-Atc", "select current_database(), current_user, version()"], { cwd: new URL("..", import.meta.url), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 30000 });
  const [db, usr, ver] = out.trim().split("|");
  console.log(`✓ Conectado a "${db}" como ${usr}. ${(ver || "").split(",")[0]}`);
} catch (e) {
  console.error("✗ No se pudo conectar:", (e.stderr || e.message || "").toString().trim().split("\n")[0]);
  process.exit(1);
}
