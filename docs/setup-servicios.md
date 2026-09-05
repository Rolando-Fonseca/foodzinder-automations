# Servicios externos del P5

Todo gratuito y sin tarjeta. Los valores van en el fichero `.env` de este proyecto:

```
C:\Users\liand\Documents\Founder IA\Sesión 17 - Automatización de Procesos con n8n y  IA\foodzinder-automations\.env
```

Crear el fichero copiando `.env.example` y editándolo con el editor de texto o Git Bash (no con PowerShell y `>`).

## 1. n8n en local (5 minutos)

1. Generar la clave de cifrado en Git Bash y pegarla en `N8N_ENCRYPTION_KEY`. No cambiarla nunca después: cifra las credenciales guardadas.
   ```bash
   openssl rand -hex 32
   ```
2. Poner una contraseña en `N8N_BASIC_AUTH_PASSWORD`.
3. Copiar de Vercel (proyecto Foodzinder → Settings → Environment Variables) los valores de `FOODZINDER_API_KEY` y `WEBHOOK_SECRET` a `FOODZINDER_API_KEY` y `FOODZINDER_WEBHOOK_SECRET`.
4. `npm run n8n:up` y abrir http://localhost:5678. La primera vez n8n pide crear el usuario propietario del editor.

## 2. Bot de Telegram (5 minutos)

BotFather es un chat dentro de Telegram, como un contacto más: le escribes órdenes y él crea bots. Hace falta tener Telegram instalado (móvil o escritorio) con una cuenta.

**Crear el bot**

1. Abrir Telegram y, en la lupa de buscar (arriba), escribir `BotFather`. Aparece un contacto con un tick azul de verificado llamado **BotFather**. Tocarlo para abrir el chat. Si hay varios resultados, el bueno es el verificado; los demás son imitaciones.
2. Pulsar **Iniciar** (o escribir `/start`). Responde con una lista de comandos.
3. Escribir `/newbot` y enviar.
4. Pregunta el nombre visible del bot: escribir `Foodzinder Ops` y enviar.
5. Pregunta el nombre de usuario: tiene que ser único y terminar en `bot`, sin espacios. Por ejemplo `foodzinder_rolando_bot`. Si dice que está cogido, probar otro.
6. Responde "Done! Congratulations…" y, en medio del mensaje, una línea de texto como `123456789:AAH…` de unos 45 caracteres. Ese es el **token**. Tocarlo para copiarlo (en el móvil, mantener pulsado → copiar).
7. Pegarlo en el `.env` de este proyecto en la línea `TELEGRAM_BOT_TOKEN=` (sin espacios ni comillas). No compartirlo: quien lo tenga controla el bot.

**Abrir el chat con tu bot (imprescindible)**

8. En el mismo mensaje de BotFather hay un enlace `t.me/<tu_bot>`. Tocarlo abre el chat con el bot nuevo. Pulsar **Iniciar** y escribir `hola`. Sin este paso, Telegram no permite que el bot te escriba.

**Obtener tu chat id**

9. En una terminal, dentro de la carpeta del proyecto:
   ```bash
   node scripts/telegram-set-webhook.mjs --chat-id
   ```
   Imprime una línea `TELEGRAM_ADMIN_CHAT_ID=123456789   # Tu nombre`. Copiar ese número al `.env` en `TELEGRAM_ADMIN_CHAT_ID=`.

Comprobación rápida: `node scripts/telegram-set-webhook.mjs --chat-id` debe mostrar el nombre del bot y tu chat. Si dice que nadie ha escrito al bot, repetir el paso 8.

## 3. Correo con Gmail (5 minutos)

1. En la cuenta de Google, activar la verificación en dos pasos si no lo está.
2. **Seguridad → Contraseñas de aplicaciones** → crear una para "n8n". Son 16 letras.
3. `SMTP_USER` = tu Gmail; `SMTP_PASSWORD` = esa contraseña; `EMAIL_FROM` con tu Gmail entre `<>` para que Gmail no lo marque como falso.

## 4. Gemini

`GOOGLE_AI_API_KEY`: la misma clave que ya está en `C:\Users\liand\Documents\Founder IA\claude-banana\.env`. `GEMINI_MODEL` se deja en `gemini-3.6-flash`.

## 5. Render + Neon (Fase 5)

1. En Neon, proyecto `foodzinder` → **Databases → New database** → nombre `n8n`. Copiar host, usuario y contraseña de la cadena de conexión **sin** pooling.
2. En Render, **New → Blueprint**, conectar el repo `foodzinder-automations`; lee `render.yaml`. Rellenar las variables marcadas como `sync: false` con los valores del `.env` (los de Neon en `DB_POSTGRESDB_*`).
3. Cuando arranque, abrir `https://foodzinder-n8n.onrender.com`, crear el usuario propietario e importar los JSON de `workflows/`.
4. Activar los flujos. No hay que crear credenciales en n8n: Telegram, Gemini y el correo se llaman con las variables de entorno. Registrar el webhook del bot con `node scripts/telegram-set-webhook.mjs --url https://foodzinder-n8n.onrender.com/webhook/telegram`.
5. En Vercel (Foodzinder), `WEBHOOK_URLS = https://foodzinder-n8n.onrender.com/webhook/foodzinder`, Redeploy, y "Enviar evento de prueba" desde `/dashboard/admin/webhooks`.

## 6. Túnel temporal para probar en local con eventos reales (Fase 1)

```bash
npx cloudflared tunnel --url http://localhost:5678
```

Da una URL `https://….trycloudflare.com` válida mientras el comando esté abierto. Ponerla en `WEBHOOK_URLS` de Vercel como `https://….trycloudflare.com/webhook/foodzinder` solo para la prueba, y quitarla después.
