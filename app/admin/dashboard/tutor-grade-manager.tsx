"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeactivateButton } from "./deactivate-button";

type Grade = {
  id: string;
  display_name: string;
};

type TutorGrade = {
  tutorGradeId: string;
  gradeName: string;
};

type Tutor = {
  tutorId: string;
  name: string;
  email: string;
  gradeNames: string[];
  tutorGrades?: TutorGrade[];
};

export function TutorGradeManager({
  tutors,
  grades,
}: {
  tutors: Tutor[];
  grades: Grade[];
}) {
  const router = useRouter();

  const [selectedTutorId, setSelectedTutorId] = useState(tutors[0]?.tutorId ?? "");
  const [selectedGradeId, setSelectedGradeId] = useState(grades[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function assignGrade() {
    if (!selectedTutorId || !selectedGradeId) {
      setError("Selecciona tutor y grado.");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/tutors/${selectedTutorId}/grades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gradeId: selectedGradeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo asignar el grado.");
        return;
      }

      setMessage("Grado asignado al tutor correctamente.");
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
          Grados que enseña cada tutor
        </h2>
        <p className="mt-2 text-sm text-[#5A6B73]">
          Un tutor puede enseñar uno o varios grados.
        </p>
      </div>

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={selectedTutorId}
            onChange={(event) => setSelectedTutorId(event.target.value)}
            className="rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
          >
            {tutors.map((tutor) => (
              <option key={tutor.tutorId} value={tutor.tutorId}>
                {tutor.name || tutor.email}
              </option>
            ))}
          </select>

          <select
            value={selectedGradeId}
            onChange={(event) => setSelectedGradeId(event.target.value)}
            className="rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
          >
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.display_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={assignGrade}
          disabled={loading || !selectedTutorId || !selectedGradeId}
          className="mt-5 rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
        >
          {loading ? "Asignando..." : "Asignar grado"}
        </button>

        {message && (
          <p className="mt-4 rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
            {message}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-[#E2DFD7] p-6">
        <h3 className="text-xl font-extrabold tracking-[-0.03em]">
          Tutores y grados asignados
        </h3>

        <div className="mt-4 divide-y divide-[#E2DFD7]">
          {tutors.map((tutor) => (
            <div key={tutor.tutorId} className="py-4">
              <p className="font-bold">{tutor.name || "Sin nombre"}</p>
              <p className="text-sm text-[#5A6B73]">{tutor.email}</p>

              {(tutor.tutorGrades ?? []).length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(tutor.tutorGrades ?? []).map((tutorGrade) => (
                    <div
                      key={tutorGrade.tutorGradeId}
                      className="flex items-center gap-2 rounded-lg bg-[#F7F5F0] px-3 py-2"
                    >
                      <span className="text-sm font-semibold text-[#1C2E36]">
                        {tutorGrade.gradeName}
                      </span>

                      <DeactivateButton
                        endpoint={`/api/admin/tutor-grades/${tutorGrade.tutorGradeId}/deactivate`}
                        label="Quitar"
                        confirmMessage={`¿Quitar el grado ${tutorGrade.gradeName} de este profesor?`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm font-semibold text-[#5BA8AC]">
                  Sin grados asignados
                </p>
              )}
            </div>
          ))}

          {tutors.length === 0 && (
            <p className="py-4 text-sm text-[#5A6B73]">
              No hay tutores disponibles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
