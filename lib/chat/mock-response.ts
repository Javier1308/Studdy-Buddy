function findRelevantSnippet(context: string, message: string) {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("datos") ||
    lowerMessage.includes("identificar") ||
    lowerMessage.includes("resolver")
  ) {
    const marker = "Antes de aplicar fórmulas";
    const index = context.indexOf(marker);

    if (index >= 0) {
      return context.slice(index, index + 700);
    }
  }

  if (
    lowerMessage.includes("valor presente") ||
    lowerMessage.includes("vp")
  ) {
    const marker = "1. Valor presente";
    const index = context.indexOf(marker);

    if (index >= 0) {
      return context.slice(index, index + 700);
    }
  }

  return context.slice(0, 1000);
}

export function generateMockChatResponse({
  message,
  hasSkill,
  hasContext,
  skillPreview,
  contextPreview,
  conversationHistoryLength,
}: {
  message: string;
  hasSkill: boolean;
  hasContext: boolean;
  skillPreview?: string;
  contextPreview?: string;
  conversationHistoryLength?: number;
}) {
  const relevantSnippet = contextPreview
    ? findRelevantSnippet(contextPreview, message)
    : "";

  return `Respuesta mock de Buddy IA.

Entendí tu pregunta:
"${message}"

Contexto usado:
- Perfil personalizado activo: ${hasSkill ? "sí" : "no"}
- Material del curso compilado: ${hasContext ? "sí" : "no"}
- Turnos previos en sesión: ${conversationHistoryLength ?? 0}

Respuesta simulada:
Antes de resolver un ejercicio de matemática financiera, debes identificar los datos principales del enunciado:

1. Monto inicial o valor presente.
2. Monto final o valor futuro.
3. Tasa de interés.
4. Número de periodos.
5. Si los pagos son vencidos o adelantados.
6. Si la tasa y los periodos están en la misma unidad de tiempo.

También recuerda revisar si la tasa está expresada anual, mensual, semestral, etc. Un error común es usar una tasa anual con pagos mensuales sin convertirla.

Como tu perfil indica que conviene ir paso a paso, primero subraya los datos importantes del enunciado antes de elegir una fórmula.

Fragmento relevante detectado del material:
${relevantSnippet || "No se encontró un fragmento relevante en el material."}

Nota:
Esta sigue siendo una respuesta mock. Cuando conectemos el proveedor real, Buddy IA responderá dinámicamente según la pregunta.`;
}
