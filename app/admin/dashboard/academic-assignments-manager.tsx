"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DeactivateButton } from "./deactivate-button";

type StudentOption = {
  studentId: string;
  name: string;
  email: string;
};

type TutorOption = {
  tutorId: string;
  name: string;
  email: string;
};

type CourseOption = {
  id: string;
  name: string;
};

type AssignmentRow = {
  id: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  tutorName: string;
  tutorEmail: string;
};

export function AcademicAssignmentsManager({
  students,
  tutors,
  courses,
  assignments,
}: {
  students: StudentOption[];
  tutors: TutorOption[];
  courses: CourseOption[];
  assignments: AssignmentRow[];
}) {
  const router = useRouter();

  const [studentId, setStudentId] = useState(students[0]?.studentId ?? "");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [tutorId, setTutorId] = useState(tutors[0]?.tutorId ?? "");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/academic-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          courseId,
          tutorId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo guardar la asignación.");
        return;
      }

      setMessage("Asignación guardada correctamente.");
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
          Asignaciones académicas
        </h2>

        <p className="mt-2 text-sm text-[#5A6B73]">
          Define qué tutor acompaña a cada estudiante en cada curso.
        </p>
      </div>

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold">
              Estudiante
            </label>
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
            >
              {students.map((student) => (
                <option key={student.studentId} value={student.studentId}>
                  {student.name || student.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Curso
            </label>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Tutor
            </label>
            <select
              value={tutorId}
              onChange={(event) => setTutorId(event.target.value)}
              className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
            >
              {tutors.map((tutor) => (
                <option key={tutor.tutorId} value={tutor.tutorId}>
                  {tutor.name || tutor.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !studentId || !courseId || !tutorId}
          className="mt-5 rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar asignación"}
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
          Asignaciones actuales
        </h3>

        <div className="mt-4 divide-y divide-[#E2DFD7]">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="grid gap-4 py-4 md:grid-cols-4 md:items-center"
            >
              <div>
                <p className="font-bold">{assignment.studentName || "Sin nombre"}</p>
                <p className="text-sm text-[#5A6B73]">
                  {assignment.studentEmail}
                </p>
              </div>

              <div>
                <p className="font-bold">{assignment.courseName}</p>
                <p className="text-sm text-[#5A6B73]">Curso asignado</p>
              </div>

              <div>
                <p className="font-bold">{assignment.tutorName || "Sin nombre"}</p>
                <p className="text-sm text-[#5A6B73]">
                  {assignment.tutorEmail}
                </p>
              </div>

              <div className="md:text-right">
                <DeactivateButton
                  endpoint={`/api/admin/academic-assignments/${assignment.id}/deactivate`}
                  label="Quitar asignación"
                  confirmMessage="¿Quitar esta asignación académica?"
                />
              </div>
            </div>
          ))}

          {assignments.length === 0 && (
            <p className="py-4 text-sm text-[#5A6B73]">
              Todavía no hay asignaciones académicas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
