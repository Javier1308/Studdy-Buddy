"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Grade = {
  id: string;
  display_name: string;
};

type Course = {
  id: string;
  name: string;
};

type Tutor = {
  tutorId: string;
  name: string;
  email: string;
  gradeIds: string[];
};

type Assignment = {
  courseId: string;
  tutorId: string;
};

export function StudentEditForm({
  studentId,
  initialGradeId,
  initialAssignments,
  grades,
  courses,
  tutors,
}: {
  studentId: string;
  initialGradeId: string | null;
  initialAssignments: Assignment[];
  grades: Grade[];
  courses: Course[];
  tutors: Tutor[];
}) {
  const router = useRouter();

  const [gradeId, setGradeId] = useState(initialGradeId ?? "");
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const availableTutors = useMemo(() => {
    if (!gradeId) return [];
    return tutors.filter((tutor) => tutor.gradeIds.includes(gradeId));
  }, [gradeId, tutors]);

  function addAssignment() {
    const firstCourse = courses.find(
      (course) => !assignments.some((assignment) => assignment.courseId === course.id)
    );

    const firstTutor = availableTutors[0];

    if (!firstCourse || !firstTutor) return;

    setAssignments((current) => [
      ...current,
      {
        courseId: firstCourse.id,
        tutorId: firstTutor.tutorId,
      },
    ]);
  }

  function updateAssignment(index: number, field: keyof Assignment, value: string) {
    setAssignments((current) =>
      current.map((assignment, currentIndex) => {
        if (currentIndex !== index) return assignment;

        if (field === "courseId") {
          return {
            ...assignment,
            courseId: value,
          };
        }

        return {
          ...assignment,
          tutorId: value,
        };
      })
    );
  }

  function removeAssignment(index: number) {
    setAssignments((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
  }

  async function saveChanges() {
    setLoading(true);
    setMessage("");
    setError("");

    if (!gradeId) {
      setError("Selecciona un grado para el estudiante.");
      setLoading(false);
      return;
    }

    const duplicatedCourse = assignments.some((assignment, index) =>
      assignments.some(
        (otherAssignment, otherIndex) =>
          otherIndex !== index && otherAssignment.courseId === assignment.courseId
      )
    );

    if (duplicatedCourse) {
      setError("Un estudiante no puede tener el mismo curso asignado más de una vez.");
      setLoading(false);
      return;
    }

    const invalidTutor = assignments.some(
      (assignment) =>
        !tutors
          .find((tutor) => tutor.tutorId === assignment.tutorId)
          ?.gradeIds.includes(gradeId)
    );

    if (invalidTutor) {
      setError("Uno de los tutores seleccionados no enseña el grado del estudiante.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/students/${studentId}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gradeId,
          assignments,
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
          Configuración académica del alumno
        </h2>
        <p className="mt-2 text-sm text-[#5A6B73]">
          Realiza todos los cambios necesarios y guarda al final.
        </p>
      </div>

      <div className="space-y-6 p-6">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Grado del estudiante
          </label>

          <select
            value={gradeId}
            onChange={(event) => {
              setGradeId(event.target.value);
              setAssignments([]);
            }}
            className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
          >
            <option value="">Seleccionar grado</option>
            {grades.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.display_name}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs font-medium text-[#5A6B73]">
            Si cambias el grado, se limpiarán las asignaciones locales para evitar tutores incompatibles.
          </p>
        </div>

        <div className="rounded-xl border border-[#E2DFD7] bg-[#F7F5F0] p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-xl font-extrabold tracking-[-0.03em]">
                Cursos matriculados
              </h3>
              <p className="mt-1 text-sm text-[#5A6B73]">
                Cada curso debe tener un único tutor asignado.
              </p>
            </div>

            <button
              type="button"
              onClick={addAssignment}
              disabled={!gradeId || availableTutors.length === 0}
              className="rounded-lg bg-[#2E6F87] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
            >
              Agregar curso
            </button>
          </div>

          {availableTutors.length === 0 && gradeId && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              No hay profesores asignados para enseñar este grado.
            </p>
          )}

          <div className="mt-5 space-y-3">
            {assignments.map((assignment, index) => (
              <div
                key={`${assignment.courseId}-${index}`}
                className="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-[1fr_1fr_auto] md:items-center"
              >
                <select
                  value={assignment.courseId}
                  onChange={(event) =>
                    updateAssignment(index, "courseId", event.target.value)
                  }
                  className="rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
                >
                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                      disabled={assignments.some(
                        (otherAssignment, otherIndex) =>
                          otherIndex !== index &&
                          otherAssignment.courseId === course.id
                      )}
                    >
                      {course.name}
                    </option>
                  ))}
                </select>

                <select
                  value={assignment.tutorId}
                  onChange={(event) =>
                    updateAssignment(index, "tutorId", event.target.value)
                  }
                  className="rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
                >
                  {availableTutors.map((tutor) => (
                    <option key={tutor.tutorId} value={tutor.tutorId}>
                      {tutor.name || tutor.email}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => removeAssignment(index)}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Quitar
                </button>
              </div>
            ))}

            {assignments.length === 0 && (
              <p className="rounded-lg bg-white p-4 text-sm text-[#5A6B73]">
                Este alumno aún no tiene cursos matriculados.
              </p>
            )}
          </div>
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
