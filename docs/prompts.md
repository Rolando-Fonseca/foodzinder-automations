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

## Prompts dentro del producto

Los prompts que se envían a Gemini viven en `src/lib/prompts.mjs`, no en los nodos, y tienen tests. Cada uno sigue la misma estructura:

1. Rol y tarea en una frase.
2. Datos del evento, delimitados y etiquetados, con la instrucción explícita de no inventar lo que falte.
3. Formato de salida cerrado (longitud, idioma, JSON cuando se va a parsear).
4. Un ejemplo corto cuando el formato importa.

*(Se amplía al cerrar cada fase.)*
