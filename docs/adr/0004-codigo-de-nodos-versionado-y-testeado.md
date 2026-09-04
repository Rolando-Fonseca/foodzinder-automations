# ADR-0004: el código de los nodos Code vive en `src/nodes/` y se inyecta en los JSON

- Estado: aceptada
- Fecha: 2026-09-04

## Contexto

En n8n, la lógica no visual va en nodos Code cuyo JavaScript queda dentro del JSON del flujo, como una cadena escapada. Editarlo en el editor es cómodo, pero no se puede testear, ni revisar en un diff, ni reutilizar entre flujos. La verificación de firma HMAC es exactamente el tipo de código que no puede fallar en silencio.

## Decisión

- Cada nodo Code tiene su fichero en `src/nodes/<nombre>.js`, escrito con la API de n8n (`$input`, `$env`, `$json`) y exportando además una función pura para tests.
- Las plantillas en `workflows/templates/*.json` llevan el marcador `{{code:<nombre>}}` en el parámetro `jsCode`.
- `npm run build` genera `workflows/*.json` sustituyendo los marcadores. `npm run check` falla si los JSON generados no coinciden con las plantillas y el código (se usa en CI).
- Los JSON generados se versionan también, para que cualquiera los importe sin ejecutar nada.

## Consecuencias

Positivas:

- La firma, el enrutado, los prompts y el formato de los mensajes tienen tests.
- Los diffs muestran cambios de lógica como código, no como una cadena escapada.
- Una función (por ejemplo, formatear una reseña) sirve en varios flujos.

Negativas:

- Editar un nodo Code en el editor de n8n y olvidar copiarlo a `src/nodes/` rompe la sincronía. `npm run check` lo detecta, pero solo si se ejecuta. Regla: el editor sirve para probar; el cambio se hace en `src/`.
- Un paso de build más que explicar en la presentación. Es, a la vez, un argumento a favor del proyecto.
