"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateSkillButton({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateSkill() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/surveys/${surveyId}/generate`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo generar el skill.md.");
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
        onClick={generateSkill}
        disabled={loading}
        className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
      >
        {loading ? "Generando..." : "Generar skill.md"}
      </button>

      {error && (
        <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
