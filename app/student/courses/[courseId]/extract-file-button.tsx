"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ExtractFileButton({ fileId }: { fileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExtract() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/files/${fileId}/extract`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo extraer el material.");
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
        onClick={handleExtract}
        disabled={loading}
        className="rounded-lg bg-[#2E6F87] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
      >
        {loading ? "Extrayendo..." : "Extraer material"}
      </button>

      {error && (
        <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
