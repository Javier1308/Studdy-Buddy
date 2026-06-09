export type OnboardingOption = {
  code: "A" | "B" | "C" | "D";
  label: string;
};

export type OnboardingQuestion = {
  id: string;
  text: string;
  options: OnboardingOption[];
};

export type OnboardingAnswers = {
  q1: "A" | "B" | "C" | "D";
  q2: "A" | "B" | "C" | "D";
  q3: "A" | "B" | "C" | "D";
  q4: "A" | "B" | "C" | "D";
  q5: "A" | "B" | "C" | "D";
  q6: "A" | "B" | "C" | "D";
  q7: "A" | "B" | "C" | "D";
  q8: "A" | "B" | "C" | "D";
};

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: "q1",
    text: "Estás aprendiendo un tema nuevo y la primera explicación no tiene sentido. ¿Qué debería hacer tu Study Buddy?",
    options: [
      { code: "A", label: "Dame una pequeña pista y déjame intentar de nuevo." },
      { code: "B", label: "Explícamelo paso a paso." },
      { code: "C", label: "Muéstrame un ejemplo primero." },
      { code: "D", label: "Pregúntame qué parte entendí." },
    ],
  },
  {
    id: "q2",
    text: "Cometes un error en un ejercicio. ¿Qué tipo de corrección te ayuda más?",
    options: [
      { code: "A", label: "Dime directamente qué hice mal." },
      { code: "B", label: "Dame una pista para que encuentre el error." },
      { code: "C", label: "Explícamelo calmadamente desde el paso anterior." },
      { code: "D", label: "Muéstrame un ejercicio similar resuelto." },
    ],
  },
  {
    id: "q3",
    text: "Tienes poco tiempo antes de una prueba o examen. ¿Qué debería hacer tu Study Buddy primero?",
    options: [
      { code: "A", label: "Dame un resumen rápido." },
      { code: "B", label: "Dame preguntas de práctica." },
      { code: "C", label: "Explícame el tema desde lo básico." },
      { code: "D", label: "Hazme preguntas estilo examen para ver qué sé." },
    ],
  },
  {
    id: "q4",
    text: "Cuando una explicación se vuelve difícil, ¿qué usualmente te ayuda a continuar?",
    options: [
      { code: "A", label: "Déjame seguir intentando con pequeñas pistas." },
      { code: "B", label: "Dame un ejemplo concreto." },
      { code: "C", label: "Explícamelo más lentamente y con calma." },
      { code: "D", label: "Divídelo en partes más pequeñas." },
    ],
  },
  {
    id: "q5",
    text: "Si tu Study Buddy te hace una pregunta y no sabes la respuesta, ¿qué debería hacer?",
    options: [
      { code: "A", label: "Dame otra oportunidad." },
      { code: "B", label: "Dame una pista." },
      { code: "C", label: "Explícame la respuesta." },
      { code: "D", label: "Muéstrame la respuesta correcta y continúa." },
    ],
  },
  {
    id: "q6",
    text: "¿Qué tipo de ejemplos te llaman más la atención?",
    options: [
      { code: "A", label: "Ejemplos de la vida cotidiana." },
      { code: "B", label: "Tecnología, videojuegos o aplicaciones." },
      { code: "C", label: "Deportes, música o pasatiempos." },
      { code: "D", label: "Ejemplos del mundo real o carrera profesional." },
    ],
  },
  {
    id: "q7",
    text: "Cuando estudias solo, ¿qué es usualmente lo más difícil?",
    options: [
      { code: "A", label: "Empezar." },
      { code: "B", label: "Mantenerme enfocado." },
      { code: "C", label: "Saber si lo estoy haciendo bien." },
      { code: "D", label: "Entender el concepto." },
    ],
  },
  {
    id: "q8",
    text: "Después de aprender algo nuevo, ¿qué te ayuda a recordarlo?",
    options: [
      { code: "A", label: "Un resumen corto." },
      { code: "B", label: "Una pregunta rápida." },
      { code: "C", label: "Un ejercicio de práctica." },
      { code: "D", label: "Explicarlo con mis propias palabras." },
    ],
  },
];
