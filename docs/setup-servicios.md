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

## 2. Bot de Telegram (3 minutos)

1. En Telegram, abrir **@BotFather** → `/newbot` → nombre `Foodzinder Ops` y usuario terminado en `bot`. Copiar el token a `TELEGRAM_BOT_TOKEN`.
2. Abrir el chat con el bot recién creado y pulsar **Start** (si no, el bot no puede escribirte).
3. Obtener tu chat id: abrir en el navegador `https://api.telegram.org/bot<TOKEN>/getUpdates` después de enviarle cualquier mensaje al bot; el número en `"chat":{"id":…}` va en `TELEGRAM_ADMIN_CHAT_ID`.

## 3. Correo con Gmail (5 minutos)

1. En la cuenta de Google, activar la verificación en dos pasos si no lo está.
2. **Seguridad → Contraseñas de aplicaciones** → crear una para "n8n". Son 16 letras.
3. `SMTP_USER` = tu Gmail; `SMTP_PASSWORD` = esa contraseña; `EMAIL_FROM` con tu Gmail entre `<>` para que Gmail no lo marque como falso.

## 4. Gemini

`GOOGLE_AI_API_KEY`: la misma clave que ya está en `C:\Users\liand\Documents\Founder IA\claude-banana\.env`. `GEMINI_MODEL` se deja en `gemini-2.5-flash`.

## 5. Render + Neon (Fase 5)

1. En Neon, proyecto `foodzinder` → **Databases → New database** → nombre `n8n`. Copiar host, usuario y contraseña de la cadena de conexión **sin** pooling.
2. En Render, **New → Blueprint**, conectar el repo `foodzinder-automations`; lee `render.yaml`. Rellenar las variables marcadas como `sync: false` con los valores del `.env` (los de Neon en `DB_POSTGRESDB_*`).
3. Cuando arranque, abrir `https://foodzinder-n8n.onrender.com`, crear el usuario propietario e importar los JSON de `workflows/`.
4. Crear en n8n las credenciales de Telegram y SMTP (los nodos las piden) y activar los flujos.
5. En Vercel (Foodzinder), `WEBHOOK_URLS = https://foodzinder-n8n.onrender.com/webhook/foodzinder`, Redeploy, y "Enviar evento de prueba" desde `/dashboard/admin/webhooks`.

## 6. Túnel temporal para probar en local con eventos reales (Fase 1)

```bash
npx cloudflared tunnel --url http://localhost:5678
```

Da una URL `https://….trycloudflare.com` válida mientras el comando esté abierto. Ponerla en `WEBHOOK_URLS` de Vercel como `https://….trycloudflare.com/webhook/foodzinder` solo para la prueba, y quitarla después.
