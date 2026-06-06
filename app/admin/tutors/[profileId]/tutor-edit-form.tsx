"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Grade = {
  id: string;
  display_name: string;
};

export function TutorEditForm({
  tutorId,
  grades,
  initialGradeIds,
}: {
  tutorId: string;
  grades: Grade[];
  initialGradeIds: string[];
}) {
  const router = useRouter();

  const [gradeIds, setGradeIds] = useState<string[]>(initialGradeIds);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggleGrade(gradeId: string) {
    setGradeIds((current) =>
      current.includes(gradeId)
        ? current.filter((id) => id !== gradeId)
        : [...current, gradeId]
    );
  }

  async function saveChanges() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/tutors/${tutorId}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gradeIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudieron guardar los cambios.");
        return;
      }

      setMessage("Cambios guardados correctamente.");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
      <div className="border-b border-[#E2DFD7] p-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
          Configuración académica del profesor
        </h2>
        <p className="mt-2 text-sm text-[#5A6B73]">
          Selecciona los grados que puede enseñar y guarda al final.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-3 md:grid-cols-2">
          {grades.map((grade) => {
            const checked = gradeIds.includes(grade.id);

            return (
              <button
                key={grade.id}
                type="button"
                onClick={() => toggleGrade(grade.id)}
                className={
                  checked
                    ? "rounded-lg border border-[#2E6F87] bg-[#E0EFEF] px-4 py-3 text-left text-sm font-bold text-[#1C2E36]"
                    : "rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-left text-sm font-semibold text-[#5A6B73] hover:bg-[#E0EFEF]"
                }
              >
                {checked ? "✓ " : ""}
                {grade.display_name}
              </button>
            );
          })}
        </div>

        {message && (
          <p className="rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
            {message}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={saveChanges}
          disabled={loading}
          className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
