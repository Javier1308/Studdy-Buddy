import { OnboardingAnswers } from "@/lib/onboarding/questions";

export function generatePersonalizationMd(answers: OnboardingAnswers): string {
  // Map Q1 & Q4 answers to preferred tutoring behavior
  const q1Map: Record<string, string> = {
    A: "Prefieres intentar de forma independiente con pequeñas pistas.",
    B: "Prefieres explicaciones paso a paso y estructuradas.",
    C: "Prefieres ver ejemplos concretos antes de la teoría.",
    D: "Prefieres un enfoque socrático donde respondas preguntas para descubrir.",
  };

  const q4Map: Record<string, string> = {
    A: "Te gusta persistir con apoyo mínimo cuando las cosas se ponen difíciles.",
    B: "Te ayuda ver ejemplos concretos cuando la explicación se complica.",
    C: "Necesitas un ambiente calmado y apoyo emocional en momentos difíciles.",
    D: "Prefieres que se divida el contenido en partes manejables.",
  };

  // Map Q2 answers to correction style
  const q2Map: Record<string, string> = {
    A: "Correcciones directas y claras sobre lo que hiciste mal.",
    B: "Pistas guiadas para que encuentres el error por ti mismo.",
    C: "Explicaciones calmadas y paso a paso desde el principio.",
    D: "Ejemplos similares ya resueltos como referencia.",
  };

  // Map Q3 answers to study strategies under pressure
  const q3Map: Record<string, string> = {
    A: "Necesitas un resumen rápido cuando tienes poco tiempo.",
    B: "Prefieres practicar con ejercicios para consolidar rápidamente.",
    C: "Prefieres entender desde lo básico aunque requiera más tiempo.",
    D: "Te gusta saber qué sabes y qué no con un diagnóstico rápido.",
  };

  // Map Q5 & Q6 answers to engagement strategy
  const q5Map: Record<string, string> = {
    A: "Te gusta tener más intentos y autonomía en la resolución.",
    B: "Te gusta el apoyo gradual con pistas apropiadas.",
    C: "Prefieres instrucción clara y directa.",
    D: "Valoras la eficiencia y quieres saber la respuesta correcta rápidamente.",
  };

  const q6Map: Record<string, string> = {
    A: "Te engancha con ejemplos de la vida cotidiana.",
    B: "Te engancha con tecnología, videojuegos y aplicaciones modernas.",
    C: "Te engancha con deportes, música y pasatiempos personales.",
    D: "Te engancha con aplicaciones del mundo real y carrera profesional.",
  };

  // Map Q7 & Q8 answers to memory and retention
  const q7Map: Record<string, string> = {
    A: "Necesitas apoyo para empezar (activación).",
    B: "Necesitas ayuda para mantener el enfoque.",
    C: "Necesitas confirmación frecuente de que estás en el camino correcto.",
    D: "Necesitas explicaciones conceptuales claras.",
  };

  const q8Map: Record<string, string> = {
    A: "Los resúmenes cortos te ayudan a consolidar.",
    B: "Las preguntas rápidas de recuperación te ayudan a recordar.",
    C: "Los ejercicios de práctica son tu mejor herramienta de retención.",
    D: "Explicar con tus propias palabras te ayuda a recordar.",
  };

  const preferredBehavior1 = q1Map[answers.q1];
  const preferredBehavior2 = q4Map[answers.q4];
  const correctionStyle = q2Map[answers.q2];
  const pressureStrategy = q3Map[answers.q3];
  const engagementStrat1 = q5Map[answers.q5];
  const engagementStrat2 = q6Map[answers.q6];
  const memoryStyle1 = q7Map[answers.q7];
  const memoryStyle2 = q8Map[answers.q8];

  return `# Active Personalization Profile

## Preferred tutoring behavior
- ${preferredBehavior1}
- ${preferredBehavior2}
- Usa preguntas de seguimiento para verificar la comprensión después de explicaciones importantes.

## Correction style
- ${correctionStyle}
- Evita hacer que el estudiante se sienta juzgado por los errores.

## Study strategies under pressure
- ${pressureStrategy}
- Cuando el tiempo es escaso, enfócate en lo más importante.

## Engagement strategy
- ${engagementStrat1}
- ${engagementStrat2}
- Adapta los ejemplos y analogías según los intereses del estudiante.

## Memory and retention style
- ${memoryStyle1}
- ${memoryStyle2}
- Ofrece oportunidades para revisar y reforzar el aprendizaje.

## Guardrails
- Nunca etiquetes al estudiante con características de personalidad fijas.
- Usa preferencias conductuales observadas en cada sesión, no diagnósticos.
- Adapta el tono según las respuestas del estudiante, no un perfil fijo.
- El estudiante puede actualizar estas preferencias en cualquier momento.
- Respeta la autonomía y el ritmo de aprendizaje del estudiante.`;
}
