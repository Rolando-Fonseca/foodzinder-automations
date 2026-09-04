# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/). Versionado semántico.

## [Unreleased]

### Añadido
- Flujo de entrada única `00-entrada-foodzinder`: webhook con cuerpo crudo, verificación HMAC en tiempo constante, normalización del sobre y enrutado por evento. Código de los nodos en `src/nodes/`, inyectado con `npm run build` y cubierto por 9 tests. Script para enviar cualquier evento firmado al n8n local.
- Esqueleto del proyecto: Docker Compose con n8n y PostgreSQL, Blueprint de Render con base de datos en Neon, Vitest.
- Documentación base: README, arquitectura, especificación de los cinco flujos, ADRs 0001 a 0004, guía de servicios, backlog y registro de prompts.
