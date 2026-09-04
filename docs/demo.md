# Guion de demo del P5 (5 minutos)

Preparación: n8n público despierto (o local con túnel), Telegram del administrador abierto en el móvil, bandeja de correo del dueño de prueba visible, panel de Foodzinder como administrador en una pestaña y ventana de incógnito en otra.

| Min | Qué se enseña | Cómo | Qué decir |
|-----|---------------|------|-----------|
| 0:00 | El contrato | `docs/api.md` del P4 en pantalla | "El P4 emite eventos firmados y expone una API con clave. El P5 no toca su base de datos: escucha eventos y llama a la API. Este documento se escribió antes que cualquiera de los dos." |
| 0:40 | Verificación de firma | Ejecuciones de n8n: una verde y una roja | "Todo evento se verifica con HMAC en tiempo constante. Esta ejecución roja es un evento con firma falsa: se para en el primer nodo y no se envía nada." |
| 1:20 | Aprobación asistida | Incógnito: dar de alta un restaurante → Telegram | "Llega el aviso con un resumen de Gemini que lista lo que falta en la ficha. Dos botones." Pulsar **Aprobar**. "El botón llama a la API del P4; el mensaje se edita con quién y cuándo. El restaurante ya está publicado." |
| 2:30 | Bienvenida | Bandeja del dueño | "Correo con la URL pública y tres consejos que salen de su carta real: platos sin alérgenos declarados, sin descripción…" |
| 3:10 | Reseña negativa y escalado | Incógnito: reseña con media 2 mencionando gluten | "El dueño recibe la reseña con un borrador de respuesta. Como la queja es de alérgenos, el administrador recibe además un aviso." Mostrar el Telegram. |
| 4:00 | Informe semanal | `POST /webhook/informe` desde una terminal | "Cron de los lunes; a mano para la demo. Tres llamadas a la API, redacción con Gemini, cifras que cuadran con el panel." |
| 4:40 | Cómo está hecho | Repo: `src/nodes`, `tests`, `npm run build` | "El código de los nodos vive fuera de n8n, con 45 tests, y se inyecta en los JSON. Cuando Gemini retiró el modelo, la degradación funcionó sola: el aviso salió con los datos crudos." |

## Preguntas probables

- **¿Por qué no usar los nodos de Telegram, Gemini y correo de n8n?** Para que todo dependa solo de variables de entorno: el mismo JSON funciona en local y en Render sin crear credenciales en el editor, y las peticiones se pueden leer y probar con `curl` (ADR-0002, ADR-0003).
- **¿Y si Foodzinder reintenta un evento?** Cada evento lleva un `id`; el flujo lo registra y los de efecto externo lo usan como clave. Foodzinder reintenta tres veces solo si n8n no responde 2xx en 5 segundos, y n8n responde al instante.
- **¿Qué pasa si la IA falla?** Cada llamada a Gemini tiene `continueRegularOutput` y el nodo siguiente comprueba si hay texto. Sin IA, el aviso lleva los datos crudos. Se probó con un fallo real (modelo retirado).
- **¿Por qué Render y no n8n Cloud?** Coste cero. La base de datos en Neon evita perder flujos en cada reinicio (ADR-0001).
- **¿Se puede editar un flujo en el editor?** Para probar, sí. El cambio se hace en `src/nodes` y `npm run build` regenera el JSON; `npm run check` en CI avisa si se desincronizan (ADR-0004).

## Antes de presentar

- [ ] Ping al n8n público y a Foodzinder dos minutos antes (ambos arrancan en frío).
- [ ] `WEBHOOK_URLS` de Foodzinder apuntando al n8n público; evento de prueba desde `/dashboard/admin/webhooks` en verde.
- [ ] Webhook del bot registrado (`node scripts/telegram-set-webhook.mjs --info`).
- [ ] Un restaurante de prueba listo para dar de alta y un correo de dueño al que tengas acceso.
- [ ] Terminal con `curl -X POST https://<n8n>/webhook/informe` preparado.
