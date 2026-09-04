# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/). Versionado semántico.

## [Unreleased]

### Añadido
- Bienvenida al dueño (rama 02) con consejos generados a partir de la carta real, y reseña negativa (rama 03) con clasificación, borrador de respuesta y escalado al administrador si es grave. Correo por SMTP desde un nodo Code con nodemailer.

### Cambiado
- Modelo de IA: `gemini-3.6-flash` con `thinkingLevel: minimal` (ADR-0003).

### Añadido (anterior)
- Aprobación asistida (rama 01): resumen de la ficha con Gemini y aviso al administrador por Telegram con botones; flujo 01b que aprueba o rechaza con motivo desde Telegram llamando a la API privada de Foodzinder; flujo 05 que mantiene la demo despierta y avisa si cae. Código compartido de Gemini, Telegram y prompts con 20 tests nuevos.
- Flujo de entrada única `00-entrada-foodzinder`: webhook con cuerpo crudo, verificación HMAC en tiempo constante, normalización del sobre y enrutado por evento. Código de los nodos en `src/nodes/`, inyectado con `npm run build` y cubierto por 9 tests. Script para enviar cualquier evento firmado al n8n local.
- Esqueleto del proyecto: Docker Compose con n8n y PostgreSQL, Blueprint de Render con base de datos en Neon, Vitest.
- Documentación base: README, arquitectura, especificación de los cinco flujos, ADRs 0001 a 0004, guía de servicios, backlog y registro de prompts.
