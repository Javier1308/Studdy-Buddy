export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export function buildChatPrompt({
  studentMessage,
  personalizationMarkdown,
  tutorEnrichmentMarkdown,
  courseContextMarkdown,
  conversationHistory,
}: {
  studentMessage: string;
  personalizationMarkdown: string;
  tutorEnrichmentMarkdown?: string | null;
  courseContextMarkdown: string;
  conversationHistory?: ConversationTurn[];
}) {
  const systemPrompt = `
REGLA ABSOLUTA:
Solo responde usando el MATERIAL DEL CURSO RELEVANTE incluido a continuación.
Si la respuesta no está en ese material, responde exactamente:
"No encontré información sobre eso en el material de este curso. Te recomiendo revisar tus apuntes o consultar con tu tutor."
No uses conocimiento general bajo ninguna circunstancia.

Eres Buddy IA, un asistente de estudio personalizado.

Debes responder usando:
1. El perfil de personalización del estudiante.
2. El contexto confirmado del curso.
3. Un estilo claro, adaptado y paso a paso.

Reglas:
- No inventes información si no aparece en el material.
- Si el material no contiene la respuesta, dilo claramente.
- Antes de resolver ejercicios, ayuda al estudiante a identificar los datos importantes.
- Usa ejemplos cercanos a sus intereses cuando sea útil.
- Evita explicaciones demasiado largas sin verificar comprensión.

PERFIL DE PERSONALIZACIÓN DEL ESTUDIANTE (fuente principal):
${personalizationMarkdown}

${
  tutorEnrichmentMarkdown
    ? `ENRIQUECIMIENTO DEL TUTOR (referencia adicional):
${tutorEnrichmentMarkdown}

`
    : ""
}MATERIAL DEL CURSO RELEVANTE PARA ESTA PREGUNTA:
${courseContextMarkdown || "No hay material compilado del curso."}
`.trim();

  return {
    systemPrompt,
    userPrompt: studentMessage,
    conversationHistory: conversationHistory ?? [],
  };
}
