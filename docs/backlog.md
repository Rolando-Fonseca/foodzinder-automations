# Backlog por fases

Cada fase termina en commits atómicos y en una verificación concreta.

## Fase 0: repo, documentación y decisiones

- [x] Repo `foodzinder-automations` con `.gitignore`, `.env.example`, `docker-compose.yml`, `render.yaml`, Vitest.
- [x] README, arquitectura, especificación de los cinco flujos, ADRs 0001 a 0004, guía de servicios, este backlog, registro de prompts, changelog.
- [x] Repositorio público en GitHub: https://github.com/Rolando-Fonseca/foodzinder-automations

Verificación hecha: `git status` limpio; los documentos describen el objetivo, no lo hecho.

## Fase 1: n8n local y evento de extremo a extremo

- [x] `.env` local con `N8N_ENCRYPTION_KEY` y las claves de Foodzinder copiadas de su `.env`.
- [x] `docker compose up` con n8n 1.95 y Postgres 17; editor en `http://localhost:5679`. Dos tropiezos documentados en `docs/prompts.md`: el 5678 ya lo ocupaba otro n8n, y pasar `N8N_PORT` al contenedor lo hacía chocar con su Task Broker.
- [x] `src/lib/signature.mjs`, `src/nodes/verificar-firma.js`, `normalizar-evento.js` y `registrar.js` con 9 tests que ejecutan el mismo código que se inyecta en los JSON.
- [x] `scripts/build-workflows.mjs` (con `--check`) y `scripts/send-event.mjs` con cuerpos de ejemplo de todos los eventos.
- [x] Flujo `00-entrada-foodzinder` importado y activo por CLI; `webhook.test` firmado → verde; `--bad-signature` → rojo en `verificar-firma` con "Firma inválida"; `restaurant.created` → enrutado por el Switch.
- [ ] Prueba con un evento real de Foodzinder a través de un túnel temporal (opcional: la Fase 5 lo cubre con la URL pública).

Verificación hecha: tres ejecuciones en n8n con el resultado esperado cada una.

## Fase 2: flujos 1 y 5

- [ ] Bot de Telegram y chat del administrador (guía).
- [ ] `01-aprobacion-asistida`: resumen con Gemini, mensaje con botones.
- [ ] `01b-respuesta-telegram`: aprobar y rechazar con motivo llamando a la API privada.
- [ ] `05-demo-despierta`.
- [ ] Tests de los nodos: prompt de resumen, mensaje de Telegram, parseo del callback.

Verificación: alta de restaurante en Foodzinder → Telegram → Aprobar → ficha pública visible.

## Fase 3: flujos 2 y 3 con IA

- [ ] SMTP configurado (guía).
- [ ] `02-bienvenida-dueno` con consejos generados a partir de la carta real.
- [ ] `03-resena-negativa` con borrador de respuesta, clasificación y escalado a Telegram si es grave.
- [ ] Tests de prompts y de los correos (contienen URL, nombre, notas).
- [ ] Degradación probada: con `GOOGLE_AI_API_KEY` inválida, los correos llegan sin la parte de IA.

Verificación: reseña con media 2 en la demo → correo con borrador; con queja de alérgenos → también Telegram.

## Fase 4: informe semanal

- [ ] `04-informe-semanal` con cron, dos llamadas a la API y redacción.
- [ ] Test del prompt con cifras y del troceado a 4.000 caracteres.

Verificación: ejecución manual → informe cuyas cifras coinciden con `/dashboard/admin`.

## Fase 5: despliegue

- [ ] Base `n8n` en Neon; `render.yaml` desplegado; `N8N_ENCRYPTION_KEY` y variables en Render.
- [ ] Flujos importados en el n8n público; credenciales creadas.
- [ ] `WEBHOOK_URLS` de Foodzinder apuntando al n8n de Render; evento de prueba recibido.
- [ ] CI: tests y `npm run check` en cada push.
- [ ] README con URLs (n8n público, repo, Foodzinder).

Verificación: trío de URLs; alta real en Foodzinder produce un Telegram en menos de un minuto (con el servicio despierto).

## Fase 6: demo y presentación

- [ ] Guion de demo de 5 minutos.
- [ ] `docs/prompts.md` cerrado.
- [ ] Capturas de las ejecuciones y de los mensajes recibidos en `docs/screenshots/`.

## Fuera de alcance

- Chat con el restaurante, reservas, pedidos.
- Automatizar la publicación en redes sociales.
- Sustituir el correo por Resend u otro proveedor transaccional.
