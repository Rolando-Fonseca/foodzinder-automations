# Ingeniería de contexto: cómo se orquestó la IA

Registro de qué se pidió a la IA, en qué orden y con qué contexto, siguiendo el formato de los proyectos P3, P4 y P7. Aquí hay una diferencia: la IA no solo construye el proyecto, también está dentro de él (Gemini en los flujos). Se documentan las dos cosas.

## Fase 0: arrancar desde el contrato, no desde n8n

El primer prompt fue "empieza con el P5, todo en esta carpeta", con la carpeta vacía. El contexto que ya existía y se cargó antes de escribir nada:

- `docs/api.md` y `docs/n8n-integration.md` del P4: los eventos, sus cuerpos, las cabeceras de firma y los endpoints privados. El P5 no diseña nada de eso; lo consume.
- Las herramientas de la máquina: n8n instalado, Docker encendido, una clave de Gemini disponible de otro proyecto.
- Lo aprendido en el P4 sobre despliegue: Render vale para contenedores, el plan gratuito no tiene disco, Neon ya existe.

De ahí salieron las cuatro decisiones (ADRs) antes de abrir el editor de n8n: dónde corre, por qué canales avisa, qué modelo usa y cómo se versiona el código de los nodos. La cuarta es la menos obvia y la más valiosa: sacar el JavaScript de los JSON de n8n para poder testearlo.

**Lección:** cuando un proyecto consume otro, el contrato del primero es el enunciado del segundo. Leerlo entero antes de decidir ahorra rediseñar.

## Fase 1: el primer evento de extremo a extremo

Antes de abrir el editor de n8n se escribió el código de la firma con sus tests, cargando en el test el mismo fichero que se inyecta en el JSON (`tests/helpers.mjs` quita la línea de invocación de n8n y evalúa el resto). Después se importó y activó el flujo por línea de comandos, sin tocar el editor, y se lanzaron tres eventos con el script: firmado, con firma incorrecta y de otro tipo. Cada uno acabó donde debía.

Dos tropiezos de entorno, ninguno de código: el puerto 5678 ya lo ocupaba otro n8n del usuario (se respetó y el contenedor usa el 5679), y pasar `N8N_PORT` al contenedor lo hacía chocar con su propio Task Broker, que por defecto usa el 5679. Los logs del contenedor lo decían en una línea.

**Lección:** en n8n también se puede trabajar como en cualquier otro proyecto, con tests, build e importación por CLI. El editor es para mirar, no para escribir.

## Fases 2 y 3: la IA dentro del flujo, y la primera vez que la degradación sirvió de verdad

Se escribieron primero los prompts y el código compartido (Gemini, Telegram, correo), con tests; después las ramas de cada flujo; y solo entonces se lanzaron eventos reales al n8n local. La primera ejecución completa llegó hasta Telegram con `aiUsed: false`: Gemini no había respondido y el aviso salió con los datos crudos, que era exactamente el comportamiento diseñado en el ADR-0003. Leyendo la respuesta guardada en la ejecución apareció la causa: `gemini-2.5-flash` retirado para claves nuevas. Con el modelo recomendado, la segunda sorpresa: respuesta vacía con `thoughtsTokenCount: 47`, porque Gemini 3 razona antes de contestar y gasta el presupuesto de salida. `thinkingLevel: "minimal"` lo resolvió.

Con la IA funcionando, los tres textos generados se leyeron con ojos de usuario: el resumen para el administrador listaba justo los datos que faltaban en la ficha; los consejos al dueño citaban platos concretos de su carta sin alérgenos declarados; el borrador ante una queja de gluten reconocía el error sin excusas. Y un fallo de integración que los tests unitarios no podían ver: el nodo final de registro recibía la respuesta de Telegram, no el evento. Se corrigió leyendo el evento del nodo de normalización.

**Lección:** la degradación hay que probarla con un fallo real, no solo con un test. Y el modelo, con la clave que se va a usar: los nombres de modelo caducan.

## El bot de Telegram: cuando la guía no basta

La guía decía "abre @BotFather". Para alguien que no ha creado un bot, eso no significa nada: no se sabe si es una web, una app o un contacto. El usuario dio vueltas, creó el bot dos veces sin saberlo y escribió "hola" al primero mientras el token que había pegado era del segundo. Telegram, consultado por la API, lo dijo claro: ese bot no había recibido ningún mensaje. Y el bot no contestaba al "hola", lo cual era correcto pero parecía un fallo.

Tres cambios salieron de ahí: la guía explica qué es BotFather (un chat, con tick azul, con imitaciones al lado), da el enlace directo `t.me/<bot>` para no confundir bots homónimos, y el script obtiene el chat id solo, en vez de pedir abrir una URL con el token dentro. Y una frase en la guía que faltaba: "no responderá nada; es normal".

**Lección:** la frustración del usuario que "sigue cada paso y no funciona" casi siempre señala un paso que la documentación daba por obvio. Se arregla en la guía y con una herramienta, no explicándolo otra vez en el chat.

## Fase 5: el despliegue, cinco obstáculos que no eran código

Ninguno de los problemas de esta fase estaba en los flujos; todos estaban en el entorno, y cada uno se leyó en una línea de log o en una respuesta HTTP:

1. **Host de Neon pegado con la cola de la cadena** (`ENOTFOUND …/n8n?sslmode=…`): variable mal copiada. Salió un script que trocea la cadena y comprueba la conexión antes de tocar Render.
2. **`heap out of memory` a los dos minutos**: la imagen `latest` de n8n no cabe en 512 MB. Se fijó la versión probada en local y un límite de heap.
3. **`column User.role does not exist`**: la imagen nueva había migrado la base de datos a su esquema antes de fijar la versión. Se recreó la base vacía (el sistema bloqueó el `DROP SCHEMA` desde la IA; lo hizo el usuario desde Neon).
4. **`403 Blocked` al subir los flujos por API**: la protección de Render (Cloudflare) rechazaba el JSON. Una bisección automática por nodos, líneas y caracteres, con pausas para no confundir contenido con ritmo, aisló el fragmento `prompt, {`, que se parece a un ataque XSS. Renombrar una variable bastó.
5. **Entregas agotadas y clave de API caducada tras dormir**: la instancia gratuita se duerme y tarda 50 s en despertar, y sin disco regenera el secreto de sesiones. Reintentos del P4 alargados, autoping del flujo 05 y secreto fijo por variable.

**Lección:** desplegar en un plan gratuito es un ejercicio de lectura de logs. Cada tropiezo acabó como script o como variable documentada, para que la próxima persona no lo repita. Y cuando el sistema bloquea una acción destructiva, se le da al usuario el comando exacto: tardó un minuto.

## Prompts dentro del producto

Los prompts que se envían a Gemini viven en `src/lib/prompts.mjs`, no en los nodos, y tienen tests. Cada uno sigue la misma estructura:

1. Rol y tarea en una frase.
2. Datos del evento, delimitados y etiquetados, con la instrucción explícita de no inventar lo que falte.
3. Formato de salida cerrado (longitud, idioma, JSON cuando se va a parsear).
4. Un ejemplo corto cuando el formato importa.

*(Se amplía al cerrar cada fase.)*
