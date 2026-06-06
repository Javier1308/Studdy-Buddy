"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PromoteSkillButton({
  surveyId,
  studentId,
}: {
  surveyId: string;
  studentId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePromote() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/surveys/${surveyId}/promote`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo activar el skill.md.");
        return;
      }

      router.push(`/tutor/students/${studentId}`);
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
        onClick={handlePromote}
        disabled={loading}
        className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
      >
        {loading ? "Activando..." : "Activar skill.md"}
      </button>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
