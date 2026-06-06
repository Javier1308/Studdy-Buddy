"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileUpdateRequestActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<
    "approve" | "reject" | null
  >(null);

  const [error, setError] = useState("");

  async function reviewRequest(action: "approve" | "reject") {
    setLoadingAction(action);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/profile-update-requests/${requestId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            adminNotes:
              action === "reject"
                ? "Solicitud rechazada por administrador."
                : "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo revisar la solicitud.");
        return;
      }

      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 md:w-[150px]">
      <button
        type="button"
        onClick={() => reviewRequest("approve")}
        disabled={loadingAction !== null}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[#2E6F87] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#24586B] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingAction === "approve" ? "Aprobando..." : "Aprobar"}
      </button>

      <button
        type="button"
        onClick={() => reviewRequest("reject")}
        disabled={loadingAction !== null}
        className="inline-flex w-full items-center justify-center rounded-lg border border-[#E4B8B8] bg-white px-4 py-2.5 text-sm font-bold text-[#B94A4A] transition hover:bg-[#FFF4F4] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loadingAction === "reject" ? "Rechazando..." : "Rechazar"}
      </button>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
