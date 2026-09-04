# Especificación de los flujos

Cada flujo se describe con disparador, pasos, qué hace la IA, qué recibe la persona y cómo se prueba. Los nombres de nodo son los que aparecen en los JSON de `workflows/`.

## Entrada común: `00-entrada-foodzinder`

| Paso | Nodo | Detalle |
|------|------|---------|
| 1 | Webhook `POST /webhook/foodzinder` | Raw body, responde `200 {received:true}` de inmediato |
| 2 | Code `verificar-firma` | HMAC-SHA256 del cuerpo crudo con `FOODZINDER_WEBHOOK_SECRET`; compara en tiempo constante con `X-Foodzinder-Signature`; si falla, `throw` |
| 3 | Code `normalizar-evento` | Devuelve `{ id, event, occurredAt, data }` y valida que `version === 1` |
| 4 | Switch `por-evento` | Ramas: `restaurant.created`, `restaurant.resubmitted`, `restaurant.approved`, `review.created`, `webhook.test`, resto |
| 5 | Execute Workflow | Llama al flujo correspondiente pasando el evento |

Prueba: `npm run event -- webhook.test` debe producir una ejecución verde; `npm run event -- webhook.test --bad-signature` debe producir una ejecución roja en el paso 2.

## Flujo 1: `01-aprobacion-asistida`

**Disparador:** `restaurant.created` y `restaurant.resubmitted`.

| Paso | Nodo | Detalle |
|------|------|---------|
| 1 | HTTP `ficha-completa` | `GET /api/v1/admin/restaurants?status=PENDING` filtrado por `id` para tener owner, cocina y ciudad (el evento ya trae lo esencial; esto añade contexto) |
| 2 | Code `prompt-resumen` | Construye el prompt: resumir la ficha en 3 líneas y listar datos que faltan (sin teléfono, sin web, sin cocina, descripción muy corta) |
| 3 | HTTP `gemini` | `generateContent`, temperatura 0,2, 300 tokens. Continúa aunque falle |
| 4 | Code `mensaje-telegram` | Texto en Markdown con nombre, ciudad, dueño, resumen de IA (o los datos crudos si no hay IA) y enlace a `/dashboard/admin/restaurants/{id}` |
| 5 | Telegram `avisar-admin` | Mensaje al `TELEGRAM_ADMIN_CHAT_ID` con botones inline `Aprobar` (`approve:{id}`) y `Rechazar` (`reject:{id}`) |

**Respuesta a los botones:** `01b-respuesta-telegram`, con Telegram Trigger sobre `callback_query`.

| Paso | Nodo | Detalle |
|------|------|---------|
| 1 | Code `parsear-callback` | Extrae acción e id; valida que el chat es el del administrador |
| 2 | Switch | `approve` → HTTP `POST /admin/restaurants/{id}/approve`; `reject` → pide motivo: responde "Escribe el motivo respondiendo a este mensaje" y un segundo trigger de mensaje con `reply_to_message` llama a `/reject` con el texto |
| 3 | Telegram `confirmar` | Edita el mensaje original: "Aprobado por Marta a las 10:42" o "Rechazado: <motivo>" |

Prueba: `npm run event -- restaurant.created` → llega Telegram → pulsar Aprobar → el restaurante de prueba pasa a `APPROVED` en Foodzinder (comprobar en `/dashboard/admin/restaurants`).

## Flujo 2: `02-bienvenida-dueno`

**Disparador:** `restaurant.approved`.

| Paso | Nodo | Detalle |
|------|------|---------|
| 1 | HTTP `ficha-publica` | `GET /api/v1/restaurants/{slug}`: carta, categorías, alérgenos declarados |
| 2 | Code `prompt-consejos` | Tres consejos concretos a partir de la carta: platos sin alérgenos declarados, categorías vacías, falta de descripción o de foto |
| 3 | HTTP `gemini` | Temperatura 0,4, 400 tokens |
| 4 | Code `email-bienvenida` | HTML sencillo: enhorabuena, URL pública, los tres consejos, enlace al panel |
| 5 | Send Email | A `data.owner.email`, desde `EMAIL_FROM` |

Prueba: `npm run event -- restaurant.approved --to <tu correo>` → correo recibido con URL y consejos.

## Flujo 3: `03-resena-negativa`

**Disparador:** `review.created` con `data.average < 3`.

| Paso | Nodo | Detalle |
|------|------|---------|
| 1 | IF `es-negativa` | `average < 3`; si no, termina sin acción |
| 2 | Code `prompt-respuesta` | Borrador de respuesta pública del dueño: agradecer, reconocer lo concreto de la queja, no prometer lo que no se puede, invitar a volver. Además clasifica la queja: `higiene`, `alergenos`, `trato`, `precio`, `otro` |
| 3 | HTTP `gemini` | Temperatura 0,5, 500 tokens, salida JSON `{ categoria, borrador }` |
| 4 | Code `email-dueno` | Reseña completa con las cuatro notas, el borrador y el enlace a la ficha |
| 5 | Send Email | Al dueño (`data.restaurant.ownerEmail`) |
| 6 | IF `grave` | `categoria` en `higiene` o `alergenos` → Telegram al administrador |

Prueba: `npm run event -- review.created --average 2` → correo con borrador; con `--category alergenos` en el comentario → también Telegram.

## Flujo 4: `04-informe-semanal`

**Disparador:** Cron `0 8 * * 1` (lunes 8:00, Europe/Madrid). También ejecutable a mano.

| Paso | Nodo | Detalle |
|------|------|---------|
| 1 | HTTP `stats` | `GET /admin/stats?period=7d` |
| 2 | HTTP `reviews` | `GET /admin/reviews?since=<hace 7 días>` |
| 3 | Code `prompt-informe` | Cifras de la semana, comparación con el periodo anterior si existe, las tres reseñas más bajas y las tres más altas, pendientes de aprobación |
| 4 | HTTP `gemini` | Temperatura 0,3, 700 tokens: tres párrafos y una lista de "esta semana toca" |
| 5 | Telegram `informe` | Mensaje al administrador; si supera 4.000 caracteres, se parte |

Prueba: ejecutar a mano → informe en Telegram con cifras que cuadran con `/dashboard/admin`.

## Flujo 5: `05-demo-despierta`

**Disparador:** Cron cada 10 minutos, solo entre 8:00 y 22:00 (hora de Madrid).

| Paso | Nodo | Detalle |
|------|------|---------|
| 1 | HTTP `ping` | `GET /api/v1/restaurants?limit=1` con timeout 30 s |
| 2 | IF `caido` | Si no responde `200`, Telegram al administrador (máximo un aviso por hora, usando la memoria de ejecución) |

Prueba: activar y ver dos ejecuciones verdes seguidas.

## Datos de prueba

`scripts/send-event.mjs` genera eventos con la forma exacta del contrato del P4 y los firma con `FOODZINDER_WEBHOOK_SECRET` del `.env`. Los ids de restaurante se toman de la API pública de Foodzinder para que los enlaces funcionen.
