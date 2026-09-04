// Compartido: petición y respuesta de Gemini (generateContent), sin dependencias.
// Se inyecta en los nodos con `// @include shared/gemini`.
// @exports buildGeminiRequest, parseGeminiText, parseGeminiJson

function buildGeminiRequest(prompt, opts) {
  const o = opts || {};
  const generationConfig = {
    temperature: o.temperature == null ? 0.3 : o.temperature,
    maxOutputTokens: o.maxOutputTokens || 400,
    // Gemini 3 razona antes de responder y ese razonamiento consume maxOutputTokens:
    // con "minimal" no gasta nada en pensar y el presupuesto va entero a la respuesta.
    thinkingConfig: { thinkingLevel: o.thinkingLevel || "minimal" },
  };
  if (o.json) generationConfig.responseMimeType = "application/json";
  return {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
    safetySettings: [],
  };
}

/** Texto de la primera candidata, o null si la respuesta no tiene la forma esperada (error, bloqueo, timeout). */
function parseGeminiText(response) {
  try {
    const parts = response && response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts;
    if (!parts || !parts.length) return null;
    const text = parts.map((p) => p.text || "").join("").trim();
    return text || null;
  } catch (e) {
    return null;
  }
}

/** Intenta parsear la respuesta como JSON (quitando vallas ```json si las hay). null si no es JSON válido. */
function parseGeminiJson(response) {
  const text = parseGeminiText(response);
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    return null;
  }
}
