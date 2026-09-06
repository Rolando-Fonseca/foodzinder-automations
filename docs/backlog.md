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

- [x] Bot de Telegram `@foodzinder_rolando_bot` y chat del administrador. `scripts/telegram-set-webhook.mjs --chat-id` saca el chat id sin abrir URLs con el token.
- [x] Rama 01 en el flujo de entrada: prompt de resumen, Gemini por HTTP con degradación, mensaje con botones Aprobar/Rechazar.
- [x] `01b-respuesta-telegram`: webhook del bot, parseo del callback con comprobación de chat, aprobar y rechazar con motivo (respuesta al mensaje del bot) contra la API privada, edición del mensaje original y respuesta al botón.
- [x] `05-demo-despierta`: ping cada 10 minutos entre 8:00 y 22:00, aviso limitado a uno por hora.
- [x] 29 tests: Gemini (petición y parseo), Telegram (HTML, teclado, troceado), prompts, y todos los nodos de 01, 01b y 05.
- [x] Verificado en local con `restaurant.created`: la rama llega hasta Telegram con el resumen de Gemini construido; falla ahí a falta de token.
- [x] Webhook del bot registrado hacia un túnel local; `send-event.mjs --pending` toma un restaurante realmente pendiente por la API privada.

Verificación hecha (2026-09-05): `restaurant.created` con Gràcia Verde → Telegram con resumen y botones → Aprobar en el móvil → n8n llama a la API → Gràcia Verde publicado en https://foodzinder.vercel.app/restaurant/gracia-verde y el mensaje editado con quién y cuándo. Ejecuciones 48 a 50 en verde.

## Fase 3: flujos 2 y 3 con IA

- [x] SMTP de Gmail configurado con contraseña de aplicación; `scripts/send-test-email.mjs` comprueba el envío (Gmail respondió `250 OK`). Verificado el correo de bienvenida real enviado desde el nodo Code con nodemailer.
- [x] Rama 02: ficha pública por API, consejos generados con Gemini a partir de la carta real, correo con URL pública y enlace al panel.
- [x] Rama 03: solo media < 3, clasificación y borrador en JSON, correo al dueño, escalado a Telegram si es higiene o alérgenos.
- [x] Correo desde un nodo Code con nodemailer y variables `SMTP_*`; si faltan, el flujo termina con "omitido: SMTP sin configurar" en vez de fallar.
- [x] 10 tests nuevos: plantilla de correo, ramas 02 y 03 con y sin IA, escalado, envío.
- [x] Degradación probada de verdad: con `gemini-2.5-flash` retirado, los avisos salieron con datos crudos; tras pasar a `gemini-3.6-flash` con `thinkingLevel: minimal`, las tres ramas terminan con IA.

Verificación hecha en local con eventos firmados: alta → mensaje con resumen de IA (Telegram pendiente de token); aprobación → correo construido con consejos (envío omitido sin SMTP); reseña de alérgenos con media 1,8 → categoría `alergenos`, marcada grave, correo y escalado preparados.

## Fase 4: informe semanal

- [x] `04-informe-semanal` con cron (lunes 8:00) y disparador manual `POST /webhook/informe`; tres llamadas a la API privada (estadísticas, reseñas de la semana, pendientes), redacción con Gemini y envío troceado a Telegram.
- [x] 6 tests: prompt con cifras, degradación sin IA, troceado a 4.000 caracteres, llamadas fallidas anotadas en el informe.

Verificación hecha: disparo manual en local → informe redactado con las cifras reales de Foodzinder (usuarios, restaurantes por estado, reseñas, webhooks) y la lista de pendientes con enlace al panel. Envío a Telegram pendiente de token.

## Fase 5: despliegue

- [x] Base `n8n` en Neon y servicio en Render: https://foodzinder-n8n-6not.onrender.com (n8n 1.95.3 fijado y límite de heap; ver nota en ADR-0001). La base hubo que recrearla porque la imagen `latest` había aplicado migraciones de una versión más nueva.
- [x] Flujos subidos y activados por la API pública de n8n (`scripts/deploy-workflows.mjs`). La WAF de Render bloqueaba el JSON por el patrón `prompt, {`; la variable pasó a llamarse `instrucciones`. Sin credenciales en n8n: todo por variables de entorno.
- [x] Webhook del bot de Telegram apuntando al n8n público; evento firmado de prueba recibido y ejecutado en verde.
- [x] `WEBHOOK_URLS` de Foodzinder apuntando al n8n de Render; evento de prueba emitido por el Foodzinder de producción y ejecutado en el n8n público. Dos tropiezos resueltos y anotados: la instancia dormida hacía expirar los tres intentos (P4 reintenta ahora a 2, 6 y 30 s con 7 s de timeout y el flujo 05 mantiene despierto n8n), y el secreto JWT se regeneraba en cada arranque (fijado con `N8N_USER_MANAGEMENT_JWT_SECRET`).
- [x] Alta real desde la web (Raíces Valencianas, 2026-09-06): Foodzinder emitió `user.became_owner` y `restaurant.created`; el n8n de Render estaba dormido porque el autoping usaba la URL antigua de `WEBHOOK_URL`, así que las entregas se reintentaron a mano y el flujo 05 pasó a usar `RENDER_EXTERNAL_URL`. Aprobado desde Telegram por el n8n público y publicado. Dos correcciones más en el P4 salidas de esta prueba: el botón «Publicar mi restaurante» llevaba al registro, el menú del panel pasaba iconos a un Client Component (500) y el middleware bloqueaba el alta a los usuarios sin rol de dueño.
- [x] El correo de bienvenida de esa alta falló en Render con `Connection timeout`: el plan gratuito bloquea el SMTP saliente. Resuelto sin cuentas nuevas con `EMAIL_TRANSPORT=foodzinder`, que envía por el relevo `POST /api/v1/admin/email` añadido al P4 (nota en ADR-0002). Segundo tropiezo: el sandbox del nodo Code de n8n 1.95 no expone `fetch`; el relevo usa `this.helpers.httpRequest`. Verificado el 2026-09-06 con el reintento de la entrega real de Raíces Valencianas: ejecución 20 en Render, «enviado … vía Foodzinder» con id de Gmail.
- [ ] CI: tests y `npm run check` en cada push.
- [ ] README con URLs (n8n público, repo, Foodzinder).

Verificación: trío de URLs; alta real en Foodzinder produce un Telegram en menos de un minuto (con el servicio despierto).

## Fase 6: demo y presentación

- [x] Guion de demo de 5 minutos, ensayado el 2026-09-06 contra el n8n público: ping, bot, firma falsa (ejecución 22, roja), bienvenida (20) e informe (21). Resultados y preguntas probables en `docs/demo.md`.
- [x] `docs/prompts.md` cerrado con el balance del proyecto.
- [x] Capturas en `docs/screenshots/` con índice: las automáticas (ficha pública, índice de la API, n8n) hechas; las del editor de n8n, Telegram y la bandeja las aportó el administrador desde su sesión y su móvil.

## Fuera de alcance

- Chat con el restaurante, reservas, pedidos.
- Automatizar la publicación en redes sociales.
- Sustituir el correo por Resend u otro proveedor transaccional.
