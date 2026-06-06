"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteMaterialButton({
  fileId,
  isConfirmed = false,
}: {
  fileId: string;
  isConfirmed?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteMaterial() {
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/files/${fileId}/delete`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo eliminar el material.");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
      >
        Eliminar material
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E2DFD7] bg-white p-6 shadow-[0_20px_60px_rgba(28,46,54,.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
              Confirmar eliminación
            </p>

            <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-[#1C2E36]">
              ¿Eliminar este material?
            </h2>

            <p className="mt-3 text-sm leading-relaxed text-[#5A6B73]">
              Esta acción eliminará el archivo de este curso.
            </p>

            {isConfirmed && (
              <p className="mt-3 rounded-lg bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
                Este material ya estaba confirmado. Al eliminarlo, Buddy IA debe dejar de usarlo en el contexto del curso.
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError("");
                }}
                disabled={deleting}
                className="rounded-lg border border-[#E2DFD7] bg-white px-5 py-3 text-sm font-semibold text-[#1C2E36] hover:bg-[#F7F5F0] disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={deleteMaterial}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? "Eliminando..." : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
