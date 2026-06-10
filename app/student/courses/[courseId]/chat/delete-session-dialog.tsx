"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
  sessionId: string;
  isOpenSession: boolean;
  onOptimisticDelete: (sessionId: string) => void;
  onClose: () => void;
};

export function DeleteSessionDialog({
  courseId,
  sessionId,
  isOpenSession,
  onOptimisticDelete,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "No se pudo eliminar.");
        return;
      }

      // Optimistic removal
      onOptimisticDelete(sessionId);
      onClose();

      // Reconcile sidebar
      router.refresh();

      if (isOpenSession) {
        // Redirect to the chat hub and let the server resolve the most-recent
        // active session (or compose state). This avoids stale-list races where
        // remainingSessions[0] may already be deleted in another tab.
        router.push(`/student/courses/${courseId}/chat`);
      }
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-labelledby="delete-dialog-title"
        className="mx-4 w-full max-w-sm rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_8px_24px_rgba(46,111,135,.18)]"
      >
        <h2
          id="delete-dialog-title"
          className="text-lg font-extrabold tracking-[-0.02em] text-[#1C2E36]"
        >
          Eliminar sesión
        </h2>

        <p className="mt-3 text-sm text-[#5A6B73]">
          Esto eliminará la sesión y su historial no se podrá recuperar. ¿Continuar?
        </p>

        {error && (
          <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-[#E2DFD7] px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#F7F5F0] disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
