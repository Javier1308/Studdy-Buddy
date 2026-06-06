"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CourseDeleteButton({
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

  async function deleteCourse() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo eliminar el curso.");
        return;
      }

      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-2">
        <p className="max-w-[240px] text-right text-xs font-semibold text-[#5A6B73]">
          ¿Eliminar “{courseName}”?
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
            onClick={deleteCourse}
            disabled={loading}
            className="rounded-lg border border-[#E4B8B8] bg-[#FFF7F7] px-3 py-2 text-xs font-bold text-[#B94A4A] hover:bg-[#FDEEEE] disabled:opacity-60"
          >
            {loading ? "Eliminando..." : "Confirmar"}
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
      className="rounded-lg border border-[#E4B8B8] bg-white px-4 py-2 text-sm font-bold text-[#B94A4A] hover:bg-[#FFF7F7]"
    >
      Eliminar
    </button>
  );
}
