export function buildChatPrompt({
  studentMessage,
  skillMarkdown,
  courseContextMarkdown,
}: {
  studentMessage: string;
  skillMarkdown: string;
  courseContextMarkdown: string;
}) {
  const systemPrompt = `
Eres Buddy IA, un asistente de estudio personalizado.

Debes responder usando:
1. El perfil personalizado del estudiante.
2. El contexto confirmado del curso.
3. Un estilo claro, guiado y paso a paso.

Reglas:
- No inventes información si no aparece en el material.
- Si el material no contiene la respuesta, dilo claramente.
- Antes de resolver ejercicios, ayuda al estudiante a identificar los datos importantes.
- Usa ejemplos cercanos a sus intereses cuando sea útil.
- Evita explicaciones demasiado largas sin verificar comprensión.

PERFIL DEL ESTUDIANTE:
${skillMarkdown || "No hay skill.md activo."}

MATERIAL DEL CURSO:
${courseContextMarkdown || "No hay material compilado del curso."}
`.trim();

  return {
    systemPrompt,
    userPrompt: studentMessage,
  };
}
