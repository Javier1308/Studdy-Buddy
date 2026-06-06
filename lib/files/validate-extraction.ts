export function validateExtractedMarkdown(markdown: string) {
  const text = markdown.trim();

  if (!text) {
    return {
      status: "failed" as const,
      reason: "No se extrajo texto del archivo.",
    };
  }

  if (text.length < 80) {
    return {
      status: "needs_review" as const,
      reason: "Se extrajo muy poco texto. Puede ser un archivo escaneado o mal interpretado.",
    };
  }

  const letters = text.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/g)?.length ?? 0;
  const total = text.length;
  const letterRatio = letters / total;

  if (letterRatio < 0.35) {
    return {
      status: "needs_review" as const,
      reason: "El texto extraído contiene demasiados símbolos o caracteres poco legibles.",
    };
  }

  const words = text.split(/\s+/).filter((word) => word.length >= 3);

  if (words.length < 20) {
    return {
      status: "needs_review" as const,
      reason: "El texto extraído tiene muy pocas palabras útiles.",
    };
  }

  return {
    status: "needs_review" as const,
    reason: "Extracción lista para revisión del estudiante.",
  };
}
