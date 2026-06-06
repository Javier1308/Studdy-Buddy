"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function AutoExtractFile({ fileId }: { fileId: string }) {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    async function runExtraction() {
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
      }
    }

    runExtraction();
  }, [fileId, router]);

  return (
    <div className="text-sm">
      <span className="rounded-lg bg-[#E0EFEF] px-4 py-2 font-semibold text-[#1C2E36]">
        Extrayendo...
      </span>

      {error && (
        <p className="mt-2 font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
