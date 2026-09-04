# Foodzinder Automations

Capa de automatización con **n8n e IA** sobre [Foodzinder](https://github.com/Rolando-Fonseca/sesi-n-10---Directorio-de-restaurantes---pr-ctica), el directorio de restaurantes del P4. Proyecto **P5** del módulo (Sesión 17: automatización de procesos con n8n e IA).

> **n8n:** pendiente de despliegue · **Foodzinder (P4):** https://foodzinder.vercel.app · **Docs:** [arquitectura](docs/architecture.md) · [flujos](docs/flujos.md) · [ADRs](docs/adr/) · [ingeniería de contexto](docs/prompts.md) · [changelog](CHANGELOG.md)

## Qué automatiza

Foodzinder emite eventos firmados (alta de restaurante, aprobación, rechazo, reseña, suscripción) y expone una API privada con clave. n8n los recibe y hace el trabajo que antes exigía a una persona mirar el panel:

| Flujo | Disparador | Qué hace | IA |
|-------|-----------|----------|----|
| 1. Aprobación asistida | `restaurant.created` / `restaurant.resubmitted` | Resume la ficha y avisa al administrador por Telegram con botones **Aprobar** / **Rechazar**; el botón llama a la API de Foodzinder | Resumen y detección de datos incompletos |
| 2. Bienvenida al dueño | `restaurant.approved` | Correo al dueño con la URL pública y tres consejos concretos según su carta | Consejos personalizados |
| 3. Alerta de reseña negativa | `review.created` con media < 3 | Correo al dueño con un borrador de respuesta empática y un aviso al administrador si detecta un problema grave | Borrador de respuesta y clasificación |
| 4. Informe semanal | Cron, lunes 8:00 | Lee estadísticas y reseñas de la semana por API y envía un informe al administrador | Redacción del informe |
| 5. Demo despierta | Cron cada 10 minutos en horario de demo | Ping a la API pública para evitar el arranque en frío | No |

Todos los flujos verifican la firma HMAC del evento antes de hacer nada, y registran cada ejecución para poder auditarla.

## Cómo funciona por dentro

- Los flujos viven en `workflows/*.json`, importables en cualquier n8n.
- El código de los nodos Code se escribe en `src/nodes/` y se inyecta en los JSON con `npm run build`. Así se testea con Vitest y no vive solo dentro del editor.
- `scripts/send-event.mjs` simula cualquier evento de Foodzinder con firma válida contra un n8n local, para desarrollar sin tocar producción.

## Cómo ejecutarlo

Requisitos: Docker y Node 22 (o Bun).

```bash
cp .env.example .env        # rellenar según docs/setup-servicios.md
npm run n8n:up              # n8n + Postgres en http://localhost:5678
npm run build               # genera workflows/*.json desde src/nodes y las plantillas
npm test                    # tests de los nodos
npm run event -- restaurant.created   # envía un evento firmado al n8n local
```

Importar los flujos: en n8n, **Workflows → Import from file** con cada JSON de `workflows/`.

## Estado

| Fase | Contenido | Estado |
|------|-----------|--------|
| 0 | Repo, documentación base, decisiones | En curso |
| 1 | n8n local en Docker, verificación de firma, evento de prueba de extremo a extremo | Pendiente |
| 2 | Flujos 1 y 5 (aprobación asistida y demo despierta) | Pendiente |
| 3 | Flujos 2 y 3 (bienvenida y reseña negativa) con IA | Pendiente |
| 4 | Flujo 4 (informe semanal) | Pendiente |
| 5 | Despliegue en Render con Neon, Foodzinder apuntando al n8n público | Pendiente |
| 6 | Demo y presentación | Pendiente |

Detalle en [docs/backlog.md](docs/backlog.md).

## Estructura

```
workflows/            # JSON importables en n8n (generados)
workflows/templates/  # plantillas con {{code:nombre}} donde va el código de src/nodes
src/nodes/            # código de los nodos Code, uno por fichero, testeado
src/lib/              # utilidades compartidas (firma, cliente de Foodzinder, prompts)
scripts/              # build de workflows y envío de eventos de prueba
tests/                # Vitest
docs/                 # arquitectura, flujos, ADRs, backlog, prompts, setup
```

## Licencia

Uso académico.
