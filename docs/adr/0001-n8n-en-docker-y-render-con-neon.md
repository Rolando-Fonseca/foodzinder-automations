# ADR-0001: n8n autoalojado en Docker, con URL pública en Render y base de datos en Neon

- Estado: aceptada
- Fecha: 2026-09-04

## Contexto

La entrega necesita un n8n con URL pública para que Foodzinder (en Vercel) le envíe eventos, y que siga existiendo después de la presentación. Opciones: n8n Cloud (de pago tras la prueba), un VPS (el usuario ya pagó uno para otra sesión y no quiere repetir), o un servicio gratuito de contenedores. Render ofrece un plan gratuito para contenedores, pero sin disco persistente: n8n perdería flujos y credenciales en cada reinicio si usara SQLite.

## Decisión

- En local, `docker-compose.yml` con la imagen oficial de n8n y PostgreSQL 17.
- En público, Render (plan gratuito, región Frankfurt) con la misma imagen, definido en `render.yaml`, y la base de datos de n8n en **Neon**, en una base nueva del mismo proyecto que ya usa Foodzinder.
- Misma configuración en los dos sitios: variables de entorno, `NODE_FUNCTION_ALLOW_BUILTIN=crypto` para verificar firmas en nodos Code, y una `N8N_ENCRYPTION_KEY` fija para no perder las credenciales.

## Nota de implementación (2026-09-06)

El primer despliegue con `n8nio/n8n:latest` arrancaba, pasaba el health check y caía a los dos minutos con `JavaScript heap out of memory`: las versiones recientes lanzan además runners de tareas y un intérprete de Python que no caben en los 512 MB de la instancia gratuita. Se fija la misma versión que en local, `1.95.3`, y `NODE_OPTIONS=--max-old-space-size=384`. Con eso el servicio se mantiene estable. Render asignó el nombre `foodzinder-n8n-6not` porque el Blueprint se aplicó dos veces; el Blueprint quedó en "Failed sync", así que los cambios de configuración se hacen en la pestaña Environment del servicio y se reflejan a mano en `render.yaml`.

## Consecuencias

Positivas:

- Coste cero y sin tarjeta.
- Flujos y credenciales sobreviven a reinicios y despliegues porque viven en Postgres.
- Un solo Docker Compose sirve para desarrollar y para reproducir la demo en cualquier máquina.

Negativas:

- Render gratuito duerme el servicio tras 15 minutos sin tráfico: el primer evento tras una pausa tarda 30 a 60 segundos. Foodzinder reintenta (2 s, 8 s, 30 s), así que el evento llega, pero puede llegar en el tercer intento. El flujo 5 mantiene despierto el servicio en horario de demo.
- Neon gratuito limita horas de cómputo; n8n hace consultas frecuentes a su base de datos. Se vigila desde el panel de Neon; si se agotara, el respaldo es SQLite en local para la presentación.
- Render puede tardar en arrancar la imagen de n8n (unos 300 MB). Aceptable.
