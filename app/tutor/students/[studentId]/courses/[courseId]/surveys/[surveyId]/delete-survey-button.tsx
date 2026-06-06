"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteSurveyButton({
  surveyId,
  studentId,
  courseId,
  disabled = false,
}: {
  surveyId: string;
  studentId: string;
  courseId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function deleteSurvey() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/surveys/${surveyId}/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          courseId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo eliminar la encuesta.");
        return;
      }

      setOpen(false);
      router.push(`/tutor/students/${studentId}`);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (disabled) {
    return (
      <div className="group relative inline-flex">
        <button
          type="button"
          disabled
          className="cursor-not-allowed rounded-lg border border-[#D8D2C7] bg-[#E2DFD7] px-5 py-3 text-sm font-semibold text-[#5A6B73] opacity-80"
        >
          Eliminar encuesta
        </button>

        <div className="pointer-events-none absolute left-0 top-full z-20 mt-3 w-72 translate-y-1 rounded-xl border border-[#E2DFD7] bg-white px-4 py-3 text-left text-xs font-semibold leading-relaxed text-[#1C2E36] opacity-0 shadow-[0_10px_30px_rgba(28,46,54,.16)] transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
          <div className="absolute -top-1.5 left-6 h-3 w-3 rotate-45 border-l border-t border-[#E2DFD7] bg-white" />
          No puedes eliminar la encuesta activa. Primero activa otra skill.md para este curso.
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
      >
        Eliminar encuesta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2DFD7] bg-white p-6 shadow-[0_20px_60px_rgba(28,46,54,.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
              Confirmar eliminación
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-[#1C2E36]">
              ¿Eliminar esta encuesta?
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-[#5A6B73]">
              Esta acción eliminará definitivamente la encuesta y el skill.md generado.
              No podrás recuperarla después.
            </p>

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
                disabled={loading}
                className="rounded-lg border border-[#E2DFD7] bg-white px-5 py-3 text-sm font-semibold text-[#1C2E36] hover:bg-[#F7F5F0] disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={deleteSurvey}
                disabled={loading}
                className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {loading ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
