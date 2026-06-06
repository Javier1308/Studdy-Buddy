"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeactivateButton({
  endpoint,
  label = "Desactivar",
  confirmMessage = "¿Seguro que quieres desactivar este registro?",
}: {
  endpoint: string;
  label?: string;
  confirmMessage?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDeactivate() {
    const confirmed = window.confirm(confirmMessage);

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo desactivar.");
        return;
      }

      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDeactivate}
        disabled={loading}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
      >
        {loading ? "Desactivando..." : label}
      </button>

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
