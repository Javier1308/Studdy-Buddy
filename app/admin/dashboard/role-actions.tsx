"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "student" | "tutor" | "admin";

export function AdminRoleActions({
  profileId,
  currentRole,
}: {
  profileId: string;
  currentRole: Role;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(currentRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/profiles/${profileId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo actualizar el rol.");
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
    <div className="flex flex-col items-start gap-2 md:items-end">
      <div className="flex flex-wrap gap-2">
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as Role)}
          className="rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-3 py-2 text-sm font-semibold"
        >
          <option value="student">student</option>
          <option value="tutor">tutor</option>
          <option value="admin">admin</option>
        </select>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="rounded-lg bg-[#2E6F87] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
        >
          {loading ? "Guardando..." : "Guardar rol"}
        </button>
      </div>

      {error && <p className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
