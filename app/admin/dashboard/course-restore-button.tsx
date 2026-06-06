"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CourseRestoreButton({
  courseId,
  courseName,
}: {
  courseId: string;
  courseName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function restoreCourse() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/courses/${courseId}/restore`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo restaurar el curso.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (success) {
    return (
      <p className="text-right text-xs font-semibold text-[#2E6F87]">
        Curso restaurado.
      </p>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-[280px] text-right text-xs font-semibold text-[#5A6B73]">
          ¿Restaurar &ldquo;{courseName}&rdquo;?
        </p>

        <p className="max-w-[280px] text-right text-xs text-[#5A6B73]">
          Al restaurar, el curso vuelve a ser visible, pero los alumnos y profesores permanecen inactivos hasta que reactives sus asignaciones por separado.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="rounded-lg border border-[#E2DFD7] bg-white px-3 py-2 text-xs font-bold text-[#1C2E36] hover:bg-[#F7F5F0] disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={restoreCourse}
            disabled={loading}
            className="rounded-lg border border-[#B0D4DC] bg-[#E0EFEF] px-3 py-2 text-xs font-bold text-[#2E6F87] hover:bg-[#CCE5EA] disabled:opacity-60"
          >
            {loading ? "Restaurando..." : "Confirmar"}
          </button>
        </div>

        {error && (
          <p className="text-right text-xs font-semibold text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-[#B0D4DC] bg-white px-4 py-2 text-sm font-bold text-[#2E6F87] hover:bg-[#E0EFEF]"
    >
      Restaurar
    </button>
  );
}
