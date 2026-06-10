"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export function SessionActions({ courseId }: { courseId: string }) {
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function fetchCount() {
      try {
        const response = await fetch(`/api/chat/sessions?courseId=${courseId}`);
        const data = await response.json();
        if (response.ok) {
          setSessionCount(data.count || 0);
        }
      } catch (error) {
        console.error("Failed to fetch session count:", error);
      }
    }

    fetchCount();
  }, [courseId, pathname]);

  const handleNewSession = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError("Llegaste al límite de 3 chats para este curso. Elimina uno para crear otro.");
        } else {
          setError(data.message || "No se pudo crear la sesión.");
        }
        return;
      }

      router.push(`/student/courses/${courseId}/chat/${data.session.id}`);
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const isAtLimit = sessionCount >= 3;

  return (
    <div className="mt-4">
      <button
        onClick={handleNewSession}
        disabled={loading || isAtLimit}
        className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          isAtLimit
            ? "cursor-not-allowed bg-gray-200 text-gray-500"
            : "bg-[#2E6F87] text-white hover:bg-[#1F4E60]"
        }`}
      >
        {loading ? "Creando..." : "Nuevo chat"}
      </button>

      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
      )}

      {isAtLimit && (
        <p className="mt-2 text-xs text-[#5A6B73]">
          Máximo 3 chats por curso. Elimina uno para crear otro.
        </p>
      )}
    </div>
  );
}
