"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sessionId: string;
  currentTitle: string;
  onOptimisticRename: (sessionId: string, newTitle: string) => void;
  onClose: () => void;
};

export function RenameSessionDialog({
  sessionId,
  currentTitle,
  onOptimisticRename,
  onClose,
}: Props) {
  const [titleInput, setTitleInput] = useState(currentTitle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRename = async () => {
    const trimmed = titleInput.trim();

    if (!trimmed) {
      setError("El nombre no puede estar vacío.");
      return;
    }

    if (trimmed.length > 80) {
      setError("El nombre no puede superar los 80 caracteres.");
      return;
    }

    if (trimmed === currentTitle) {
      onClose();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "No se pudo renombrar.");
        return;
      }

      // Optimistic update
      onOptimisticRename(sessionId, trimmed);
      onClose();

      // Reconcile sidebar
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRename();
    }
    if (e.key === "Escape") {
      onClose();
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
        aria-labelledby="rename-dialog-title"
        className="mx-4 w-full max-w-sm rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_8px_24px_rgba(46,111,135,.18)]"
      >
        <h2
          id="rename-dialog-title"
          className="text-lg font-extrabold tracking-[-0.02em] text-[#1C2E36]"
        >
          Renombrar sesión
        </h2>

        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={80}
          placeholder="Nombre de la sesión"
          disabled={loading}
          autoFocus
          className="mt-4 w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-3 py-2 text-sm outline-none focus:border-[#2E6F87] disabled:opacity-60"
        />

        {error && (
          <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleRename}
            disabled={loading || !titleInput.trim()}
            className="flex-1 rounded-lg bg-[#2E6F87] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar"}
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
