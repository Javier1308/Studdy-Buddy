"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PromoteSkillButton({
  surveyId,
  studentId,
  courseId,
}: {
  surveyId: string;
  studentId: string;
  courseId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function promoteSkill() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/surveys/${surveyId}/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          courseId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo activar el skill.md.");
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
        onClick={promoteSkill}
        disabled={loading}
        className="rounded-lg bg-[#5BA8AC] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2E6F87] disabled:opacity-60"
      >
        {loading ? "Activando..." : "Activar skill.md"}
      </button>

      {error && (
        <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
