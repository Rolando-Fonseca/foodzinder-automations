# ADR-0002: Telegram para el administrador, correo SMTP para los dueños

- Estado: aceptada
- Fecha: 2026-09-04

## Contexto

Los flujos avisan a dos perfiles distintos. El administrador necesita inmediatez y poder actuar (aprobar, rechazar) sin abrir el panel. El dueño de un restaurante espera un correo formal con un enlace. Cada canal añadido es una cuenta más que configurar y un punto de fallo en la demo.

## Decisión

- **Administrador: Telegram.** Un bot creado con BotFather (gratuito, un minuto), un chat con el administrador, mensajes con botones inline. El clic vuelve a n8n por un Telegram Trigger y llama a la API privada de Foodzinder.
- **Dueños: correo por SMTP** desde el nodo Send Email de n8n, con Gmail y una contraseña de aplicación en la demo. Cualquier SMTP vale cambiando cuatro variables.
- No se usa Resend, Slack ni WhatsApp.

## Consecuencias

Positivas:

- Dos cuentas gratuitas y sin tarjeta. La demo se enseña desde el móvil del administrador.
- Los botones convierten un aviso en una acción: es el caso de uso más vistoso del P5 y el que mejor muestra la API del P4.

Negativas:

- Telegram exige que el administrador haya abierto el chat con el bot antes; se documenta en la guía.
- Gmail limita a unos 500 correos al día y marca como spam si el remitente no coincide con la cuenta. Para la demo es irrelevante; para producción habría que usar un dominio verificado.
- Las contraseñas de aplicación de Google requieren verificación en dos pasos activada en la cuenta.

## Nota de implementación (2026-09-06)

El plan gratuito de Render bloquea las conexiones SMTP salientes: el primer correo de bienvenida real terminó en `Connection timeout` contra Gmail, aunque el mismo nodo funciona en local. En vez de añadir un proveedor transaccional (otra cuenta más), el nodo `enviar-email` admite dos transportes con `EMAIL_TRANSPORT`: `smtp` en local y `foodzinder` en Render, que envía el correo ya compuesto por `POST /api/v1/admin/email` de Foodzinder (Vercel sí permite SMTP) con la clave de API. La decisión de qué correo enviar y su contenido sigue en n8n; Foodzinder solo lo transporta.

