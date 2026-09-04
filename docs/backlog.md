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

- [ ] Bot de Telegram y chat del administrador (guía, apartado 2). Pendiente del usuario.
- [x] Rama 01 en el flujo de entrada: prompt de resumen, Gemini por HTTP con degradación, mensaje con botones Aprobar/Rechazar.
- [x] `01b-respuesta-telegram`: webhook del bot, parseo del callback con comprobación de chat, aprobar y rechazar con motivo (respuesta al mensaje del bot) contra la API privada, edición del mensaje original y respuesta al botón.
- [x] `05-demo-despierta`: ping cada 10 minutos entre 8:00 y 22:00, aviso limitado a uno por hora.
- [x] 29 tests: Gemini (petición y parseo), Telegram (HTML, teclado, troceado), prompts, y todos los nodos de 01, 01b y 05.
- [x] Verificado en local con `restaurant.created`: la rama llega hasta Telegram con el resumen de Gemini construido; falla ahí a falta de token.
- [ ] Con el bot creado: registrar el webhook (`scripts/telegram-set-webhook.mjs`), pulsar Aprobar y ver el cambio en Foodzinder.

Verificación pendiente: alta de restaurante en Foodzinder → Telegram → Aprobar → ficha pública visible.

## Fase 3: flujos 2 y 3 con IA

- [ ] SMTP configurado (guía, apartado 3). Pendiente del usuario.
- [x] Rama 02: ficha pública por API, consejos generados con Gemini a partir de la carta real, correo con URL pública y enlace al panel.
- [x] Rama 03: solo media < 3, clasificación y borrador en JSON, correo al dueño, escalado a Telegram si es higiene o alérgenos.
- [x] Correo desde un nodo Code con nodemailer y variables `SMTP_*`; si faltan, el flujo termina con "omitido: SMTP sin configurar" en vez de fallar.
- [x] 10 tests nuevos: plantilla de correo, ramas 02 y 03 con y sin IA, escalado, envío.
- [x] Degradación probada de verdad: con `gemini-2.5-flash` retirado, los avisos salieron con datos crudos; tras pasar a `gemini-3.6-flash` con `thinkingLevel: minimal`, las tres ramas terminan con IA.

Verificación hecha en local con eventos firmados: alta → mensaje con resumen de IA (Telegram pendiente de token); aprobación → correo construido con consejos (envío omitido sin SMTP); reseña de alérgenos con media 1,8 → categoría `alergenos`, marcada grave, correo y escalado preparados.

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
