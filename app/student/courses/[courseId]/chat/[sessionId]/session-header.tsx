"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SessionHeader({
  courseId,
  sessionId,
  sessionTitle,
}: {
  courseId: string;
  sessionId: string;
  sessionTitle: string;
}) {
  const [title, setTitle] = useState(sessionTitle);
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(sessionTitle);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const handleRename = async () => {
    const trimmed = editInput.trim();
    if (!trimmed || trimmed === title) {
      setIsEditing(false);
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
        setEditInput(title);
        return;
      }

      setTitle(trimmed);
      setIsEditing(false);
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

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

      router.push(`/student/courses/${courseId}/chat`);
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
      <div className="flex items-center justify-between gap-4">
        {isEditing ? (
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              maxLength={80}
              placeholder="Nombre de la sesión"
              disabled={loading}
              className="flex-1 rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-3 py-2 text-sm outline-none focus:border-[#2E6F87]"
            />
            <button
              onClick={handleRename}
              disabled={loading}
              className="rounded-lg bg-[#2E6F87] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
            >
              {loading ? "..." : "Guardar"}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditInput(title);
                setError("");
              }}
              disabled={loading}
              className="rounded-lg border border-[#E2DFD7] px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#F7F5F0]"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-extrabold tracking-[-0.03em]">
                {title}
              </h1>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditInput(title);
                }}
                className="rounded-lg px-3 py-1 text-sm font-semibold text-[#2E6F87] hover:bg-[#F7F5F0]"
                title="Renombrar"
              >
                Editar
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg px-3 py-1 text-sm font-semibold text-red-600 hover:bg-red-50"
                title="Eliminar"
              >
                Eliminar
              </button>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
      )}

      {showDeleteConfirm && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            Esto eliminará la sesión y su historial no se podrá recuperar. ¿Continuar?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={loading}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
