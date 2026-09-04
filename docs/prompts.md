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

## Prompts dentro del producto

Los prompts que se envían a Gemini viven en `src/lib/prompts.mjs`, no en los nodos, y tienen tests. Cada uno sigue la misma estructura:

1. Rol y tarea en una frase.
2. Datos del evento, delimitados y etiquetados, con la instrucción explícita de no inventar lo que falte.
3. Formato de salida cerrado (longitud, idioma, JSON cuando se va a parsear).
4. Un ejemplo corto cuando el formato importa.

*(Se amplía al cerrar cada fase.)*
