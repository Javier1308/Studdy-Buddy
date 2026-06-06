"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AccountApprovalActions({
  profileId,
}: {
  profileId: string;
}) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function updateApproval(action: "approve" | "reject") {
    setLoadingAction(action);
    setError("");

    try {
      const response = await fetch(`/api/admin/profiles/${profileId}/approval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          rejectionReason:
            action === "reject"
              ? "Cuenta rechazada por administrador."
              : "",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo actualizar la solicitud.");
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
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => updateApproval("approve")}
          disabled={loadingAction !== null}
          className="rounded-lg bg-[#2E6F87] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
        >
          {loadingAction === "approve" ? "Aprobando..." : "Aprobar"}
        </button>

        <button
          type="button"
          onClick={() => updateApproval("reject")}
          disabled={loadingAction !== null}
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          {loadingAction === "reject" ? "Rechazando..." : "Rechazar"}
        </button>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-700">{error}</p>
      )}
    </div>
  );
}
