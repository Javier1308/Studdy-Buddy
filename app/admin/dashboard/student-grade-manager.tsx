"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Grade = {
  id: string;
  display_name: string;
};

type Student = {
  studentId: string;
  name: string;
  email: string;
  gradeId: string | null;
  gradeName: string | null;
};

export function StudentGradeManager({
  students,
  grades,
}: {
  students: Student[];
  grades: Grade[];
}) {
  const router = useRouter();
  const [selectedGrades, setSelectedGrades] = useState<Record<string, string>>(
    Object.fromEntries(
      students.map((student) => [student.studentId, student.gradeId ?? ""])
    )
  );

  const [loadingStudentId, setLoadingStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveGrade(studentId: string) {
    const gradeId = selectedGrades[studentId];

    if (!gradeId) {
      setError("Selecciona un grado.");
      return;
    }

    setLoadingStudentId(studentId);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/students/${studentId}/grade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gradeId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo actualizar el grado.");
        return;
      }

      setMessage("Grado actualizado correctamente.");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoadingStudentId(null);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
      <div className="border-b border-[#E2DFD7] p-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
          Grado de estudiantes
        </h2>
        <p className="mt-2 text-sm text-[#5A6B73]">
          Cada estudiante debe pertenecer a un único grado.
        </p>
      </div>

      {message && (
        <div className="mx-6 mt-6 rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
          {message}
        </div>
      )}

      {error && (
        <div className="mx-6 mt-6 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      <div className="divide-y divide-[#E2DFD7]">
        {students.map((student) => {
          const selectedGradeId = selectedGrades[student.studentId] ?? "";

          return (
            <div
              key={student.studentId}
              className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-bold">{student.name || "Sin nombre"}</p>
                <p className="text-sm text-[#5A6B73]">{student.email}</p>
                <p className="mt-1 text-xs font-semibold text-[#5BA8AC]">
                  Grado actual: {student.gradeName ?? "sin grado"}
                </p>
              </div>

              <div className="flex flex-col gap-3 md:min-w-[360px] md:flex-row">
                <select
                  value={selectedGradeId}
                  onChange={(event) =>
                    setSelectedGrades((current) => ({
                      ...current,
                      [student.studentId]: event.target.value,
                    }))
                  }
                  className="flex-1 rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
                >
                  <option value="">Seleccionar grado</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.display_name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => saveGrade(student.studentId)}
                  disabled={!selectedGradeId || loadingStudentId === student.studentId}
                  className="rounded-lg bg-[#2E6F87] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
                >
                  {loadingStudentId === student.studentId ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          );
        })}

        {students.length === 0 && (
          <div className="p-6 text-sm text-[#5A6B73]">
            No hay estudiantes.
          </div>
        )}
      </div>
    </div>
  );
}
