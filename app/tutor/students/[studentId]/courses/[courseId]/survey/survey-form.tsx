"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SurveyForm({
  studentId,
  courseId,
}: {
  studentId: string;
  courseId: string;
}) {
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [learningDifficulties, setLearningDifficulties] = useState("");
  const [preferredStyle, setPreferredStyle] = useState("step_by_step");
  const [interests, setInterests] = useState("");
  const [avoid, setAvoid] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submitSurvey() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          courseId,
          notes,
          answers: {
            learningDifficulties,
            preferredStyle,
            interests,
            avoid,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo crear la encuesta.");
        return;
      }

      router.push(
        `/tutor/students/${studentId}/courses/${courseId}/surveys/${data.surveyId}`
      );
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
        Perfil de aprendizaje para este curso
      </h2>

      <p className="mt-2 text-sm text-[#5A6B73]">
        Esta encuesta generará una skill.md específica para este alumno en este curso.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Dificultades principales en este curso
          </label>
          <textarea
            value={learningDifficulties}
            onChange={(event) => setLearningDifficulties(event.target.value)}
            className="min-h-24 w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
            placeholder="Ej: tiene dificultad para resolver ejercicios..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Estilo de explicación recomendado
          </label>
          <select
            value={preferredStyle}
            onChange={(event) => setPreferredStyle(event.target.value)}
            className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
          >
            <option value="step_by_step">Paso a paso</option>
            <option value="short_guided">Corto y guiado</option>
            <option value="examples_first">Primero ejemplos</option>
            <option value="socratic">Preguntas guiadas</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Intereses o ejemplos cercanos
          </label>
          <textarea
            value={interests}
            onChange={(event) => setInterests(event.target.value)}
            className="min-h-20 w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
            placeholder="Ej: fútbol, videojuegos, situaciones cotidianas..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Qué debería evitar Buddy IA
          </label>
          <textarea
            value={avoid}
            onChange={(event) => setAvoid(event.target.value)}
            className="min-h-20 w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
            placeholder="Ej: no centrarse tanto en teoría..."
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Notas adicionales del tutor
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
            placeholder="Ej: priorizar razonamiento por encima de memorización..."
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submitSurvey}
          disabled={loading}
          className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear encuesta"}
        </button>
      </div>
    </div>
  );
}
