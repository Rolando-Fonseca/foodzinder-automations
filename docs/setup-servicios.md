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
2. Copiar de Vercel (proyecto Foodzinder → Settings → Environment Variables) los valores de `FOODZINDER_API_KEY` y `WEBHOOK_SECRET` a `FOODZINDER_API_KEY` y `FOODZINDER_WEBHOOK_SECRET`.
3. `npm run n8n:up` y abrir http://localhost:5679 (el 5678 se deja libre por si hay otro n8n). La primera vez n8n pide crear el usuario propietario del editor.

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

Una "contraseña de aplicación" es una clave de 16 letras que Google genera para que un programa (n8n) envíe correo con tu cuenta sin conocer tu contraseña real. No cambia tu contraseña. Google no la muestra en el menú de Seguridad: se llega por dirección directa y solo existe si la verificación en dos pasos está activada.

1. Comprobar la verificación en dos pasos: abrir https://myaccount.google.com/signinoptions/twosv con tu Gmail. Si dice "Desactivada", pulsar **Activar la verificación en dos pasos** y seguir los pasos con el número de móvil (un código por SMS). Si ya está activada, seguir.
2. Abrir directamente https://myaccount.google.com/apppasswords (puede pedir la contraseña de Google otra vez; eso es normal). Si la página dice que la opción no está disponible, es que el paso 1 no está completo o la cuenta la gestiona una empresa o centro; en ese caso usar una cuenta Gmail personal.
3. En el cuadro **Nombre de la aplicación** escribir `n8n` y pulsar **Crear**.
4. Aparece un recuadro amarillo con 16 letras en cuatro grupos (`abcd efgh ijkl mnop`). Copiarlas. Solo se muestran una vez; si se pierden, se crea otra.
5. En el `.env` de este proyecto:
   - `SMTP_USER=` tu dirección de Gmail completa.
   - `SMTP_PASSWORD=` las 16 letras **sin espacios**.
   - `EMAIL_FROM=Foodzinder <tu-gmail@gmail.com>` (Gmail obliga a que el remitente sea la propia cuenta; si no, lo reescribe o lo marca como falso).
6. Comprobación: `node scripts/send-test-email.mjs tu-gmail@gmail.com` envía un correo de prueba y dice si el SMTP ha aceptado.

## 4. Gemini

`GOOGLE_AI_API_KEY`: la misma clave que ya está en `C:\Users\liand\Documents\Founder IA\claude-banana\.env`. `GEMINI_MODEL` se deja en `gemini-3.6-flash`.

## 5. Render + Neon (Fase 5)

1. En Neon, proyecto `foodzinder` → menú **Branches** → rama principal → pestaña **Databases** → **Add database** → nombre `n8n`, owner el propuesto → **Create**. Después, botón **Connect** (arriba a la derecha): elegir la base `n8n` en el desplegable, **desactivar** "Connection pooling" (el host no debe llevar `-pooler`) y copiar la cadena. Pegarla en el `.env` como `N8N_NEON_URL=postgresql://…`; `node scripts/neon-vars.mjs` la trocea en las cuatro variables `DB_POSTGRESDB_*` que pide Render y comprueba la conexión.
2. En Render, **New → Blueprint**, conectar el repo `foodzinder-automations`; lee `render.yaml`. Rellenar las variables marcadas como `sync: false` con los valores del `.env` (los de Neon en `DB_POSTGRESDB_*`).
3. Cuando arranque, abrir `https://foodzinder-n8n-6not.onrender.com` y crear el usuario propietario (correo y contraseña; es la cuenta del editor, no de n8n.io). Render añadió el sufijo `-6not` al nombre: `render.yaml` ya lleva esa URL en `N8N_HOST` y `WEBHOOK_URL`.
4. Crear una clave de API para subir los flujos sin importarlos a mano: en el editor, **Settings → n8n API → Create an API key**, nombre `deploy`, copiarla al `.env` en `N8N_PUBLIC_API_KEY=`. Después, `node scripts/deploy-workflows.mjs` crea o actualiza los cinco flujos y los activa.
5. No hay que crear credenciales en n8n: Telegram, Gemini y el correo se llaman con las variables de entorno. Registrar el webhook del bot con `node scripts/telegram-set-webhook.mjs --url https://foodzinder-n8n-6not.onrender.com/webhook/telegram`.
6. En Vercel (Foodzinder), `WEBHOOK_URLS = https://foodzinder-n8n-6not.onrender.com/webhook/foodzinder`, Redeploy, y "Enviar evento de prueba" desde `/dashboard/admin/webhooks`.

## 6. Túnel temporal para probar en local con eventos reales

```bash
npx cloudflared tunnel --url http://localhost:5679
```

Da una URL `https://….trycloudflare.com` válida mientras el comando esté abierto. Ponerla en `WEBHOOK_URLS` de Vercel como `https://….trycloudflare.com/webhook/foodzinder` solo para la prueba, y quitarla después.
