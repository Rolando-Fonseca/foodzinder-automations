# ADR-0003: Gemini por HTTP, con degradación cuando la IA no responde

- Estado: aceptada
- Fecha: 2026-09-04

## Contexto

El módulo pide IA dentro de las automatizaciones. n8n ofrece nodos de LangChain (OpenAI, Anthropic, Gemini) y un nodo HTTP genérico. El usuario ya tiene una clave de Google AI (Gemini) usada en otro proyecto; no tiene clave de OpenAI ni de Anthropic. Los nodos de LangChain cambian entre versiones de n8n y ocultan el JSON real que se envía.

## Decisión

- Llamar a Gemini con el nodo **HTTP Request** al endpoint `generateContent`, con el modelo en la variable `GEMINI_MODEL` (por defecto `gemini-3.6-flash`).
- Los prompts se construyen en `src/lib/prompts.mjs`, con tests que comprueban que incluyen los datos del evento y las instrucciones fijas: español, sin inventar datos, longitud máxima, formato de salida.
- Temperatura baja (0,2 a 0,5 según el flujo), `maxOutputTokens` acotado, timeout de 20 segundos.
- **Degradación:** si la llamada falla o excede el tiempo, el flujo continúa con los datos crudos. El aviso llega igual; solo pierde el texto generado.

## Nota de implementación (2026-09-04)

El primer modelo elegido, `gemini-2.5-flash`, ya no está disponible para claves nuevas: la API devuelve 404 y recomienda `gemini-3.6-flash`. Los modelos Gemini 3 razonan antes de responder y ese razonamiento consume `maxOutputTokens`: con 50 tokens la respuesta llegó vacía (`finishReason: MAX_TOKENS`, `thoughtsTokenCount: 47`). `thinkingBudget: 0` no es válido en Gemini 3; sí lo es `thinkingConfig.thinkingLevel: "minimal"`, que deja el presupuesto entero para la respuesta. Queda fijado en `src/shared/gemini.js`. La degradación funcionó tal cual estaba diseñada: el aviso al administrador salió sin resumen y con los datos crudos.

## Consecuencias

Positivas:

- Una sola clave, ya disponible, y un JSON que se puede leer y probar con `curl`.
- Cambiar de modelo o de proveedor es cambiar una URL y una variable.
- La demo no depende de que la IA esté disponible en ese momento.

Negativas:

- Sin las comodidades del nodo de LangChain (memoria, herramientas, parseo de salida). No se necesitan aquí.
- La salida en JSON del flujo 3 depende de que el modelo respete el formato; se valida con un nodo Code y, si no es JSON válido, se usa el texto completo como borrador.
- Cuota gratuita de Gemini con límites por minuto; suficiente para la demo.
