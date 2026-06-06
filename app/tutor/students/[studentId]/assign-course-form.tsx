"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Course = {
  id: string;
  name: string;
};

export function AssignCourseForm({
  studentId,
  courses,
}: {
  studentId: string;
  courses: Course[];
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAssign() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/tutor/students/${studentId}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo asignar el curso.");
        return;
      }

      setMessage("Curso asignado correctamente.");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
        Asignar curso
      </h2>

      <p className="mt-2 text-sm text-[#5A6B73]">
        El estudiante solo podrá ver y estudiar cursos asignados por su tutor.
      </p>

      <div className="mt-5 flex flex-col gap-3 md:flex-row">
        <select
          value={courseId}
          onChange={(event) => setCourseId(event.target.value)}
          className="flex-1 rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm font-semibold"
        >
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleAssign}
          disabled={loading || !courseId}
          className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
        >
          {loading ? "Asignando..." : "Asignar curso"}
        </button>
      </div>

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
  );
}
