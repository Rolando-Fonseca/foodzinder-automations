# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/). Versionado semántico.

## [1.1.0] - 2026-09-06

Cierre del proyecto: los cinco flujos verificados en producción con un alta real y demo ensayada.

### Añadido
- Transporte de correo `foodzinder` (`EMAIL_TRANSPORT`): el plan gratuito de Render bloquea el SMTP saliente, así que n8n compone el correo y lo envía por `POST /api/v1/admin/email` de Foodzinder. En local sigue el SMTP directo.
- Guion de demo cerrado con los resultados del ensayo contra el n8n público y las capturas en `docs/screenshots/`. `docs/prompts.md` cerrado con el balance del proyecto.

### Corregido
- El sandbox del nodo Code de n8n 1.95 no expone `fetch`; el relevo usa `this.helpers.httpRequest`.
- El flujo 05 despertaba la URL antigua del servicio; ahora usa `RENDER_EXTERNAL_URL`.

## [1.0.0] - 2026-09-06

Primera versión desplegada: https://foodzinder-n8n-6not.onrender.com, conectada a https://foodzinder.vercel.app.

### Añadido
- Despliegue en Render (n8n 1.95.3 fijado, límite de heap, secreto JWT fijo) con la base de datos en Neon; flujos subidos por la API pública con `scripts/deploy-workflows.mjs`; webhook del bot de Telegram apuntando al n8n público; autoping para que la instancia gratuita no duerma en horario de demo.
- Scripts de apoyo para la puesta en marcha: `telegram-set-webhook.mjs --chat-id`, `send-test-email.mjs`, `neon-vars.mjs`, `render-vars.mjs`.

### Corregido
- La protección de Render bloqueaba la subida de flujos por el patrón `prompt, {` en el código de los nodos: la variable pasa a llamarse `instrucciones`.

## [0.3.0] - 2026-09-05

### Añadido
- Informe semanal (flujo 04): cron de los lunes y disparador manual, cifras y reseñas por la API privada, redacción con Gemini y envío a Telegram por partes.
- Bienvenida al dueño (rama 02) con consejos generados a partir de la carta real, y reseña negativa (rama 03) con clasificación, borrador de respuesta y escalado al administrador si es grave. Correo por SMTP desde un nodo Code con nodemailer.

### Cambiado
- Modelo de IA: `gemini-3.6-flash` con `thinkingLevel: minimal` (ADR-0003).

### Añadido (anterior)
- Aprobación asistida (rama 01): resumen de la ficha con Gemini y aviso al administrador por Telegram con botones; flujo 01b que aprueba o rechaza con motivo desde Telegram llamando a la API privada de Foodzinder; flujo 05 que mantiene la demo despierta y avisa si cae. Código compartido de Gemini, Telegram y prompts con 20 tests nuevos.
- Flujo de entrada única `00-entrada-foodzinder`: webhook con cuerpo crudo, verificación HMAC en tiempo constante, normalización del sobre y enrutado por evento. Código de los nodos en `src/nodes/`, inyectado con `npm run build` y cubierto por 9 tests. Script para enviar cualquier evento firmado al n8n local.
- Esqueleto del proyecto: Docker Compose con n8n y PostgreSQL, Blueprint de Render con base de datos en Neon, Vitest.
- Documentación base: README, arquitectura, especificación de los cinco flujos, ADRs 0001 a 0004, guía de servicios, backlog y registro de prompts.
