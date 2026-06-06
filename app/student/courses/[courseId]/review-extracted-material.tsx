"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function ReviewExtractedMaterial({ fileId }: { fileId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const autoOpened = useRef(false);

  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function loadPreview() {
    setOpen(true);
    setError("");

    if (markdown) return;

    setLoadingPreview(true);

    try {
      const response = await fetch(`/api/files/${fileId}/preview`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo cargar la vista previa.");
        return;
      }

      setMarkdown(data.markdown ?? data.preview ?? "");
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    if (autoOpened.current) return;

    const reviewId = searchParams.get("review");

    if (reviewId === fileId) {
      autoOpened.current = true;
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId, searchParams]);

  function closeModal() {
    setOpen(false);
    setError("");
  }

  async function confirmMaterial() {
    setConfirming(true);
    setError("");

    try {
      const response = await fetch(`/api/files/${fileId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editedMarkdown: markdown,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo confirmar el material.");
        return;
      }

      window.dispatchEvent(new Event("material:resolved"));
      setConfirmed(true);
      setOpen(false);
      setMarkdown("");
      router.push(window.location.pathname);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setConfirming(false);
    }
  }

  async function deleteMaterial() {
    const confirmed = window.confirm(
      "¿Eliminar este material? No se usará en el contexto del curso."
    );

    if (!confirmed) return;

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
      router.push(window.location.pathname);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setDeleting(false);
    }
  }

  if (confirmed) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={loadPreview}
        className="rounded-lg bg-[#D8C447] px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:opacity-90"
      >
        Revisar y confirmar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl border border-[#E2DFD7] bg-white shadow-[0_24px_80px_rgba(28,46,54,.30)]">
            <div className="border-b border-[#E2DFD7] px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
                    Revisión del material
                  </p>

                  <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-[#1C2E36]">
                    Contenido extraído
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-[#5A6B73]">
                    Revisa y edita el texto extraído. Al confirmar, este contenido se agregará al contexto académico usado por Buddy IA.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={confirming || deleting}
                  className="rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#5A6B73] hover:bg-[#F7F5F0] disabled:opacity-60"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loadingPreview ? (
                <div className="rounded-xl bg-[#F7F5F0] p-6 text-sm font-semibold text-[#5A6B73]">
                  Cargando vista previa...
                </div>
              ) : (
                <textarea
                  value={markdown}
                  onChange={(event) => setMarkdown(event.target.value)}
                  className="min-h-[52vh] w-full resize-y rounded-xl border border-[#E2DFD7] bg-[#F7F5F0] p-5 font-mono text-sm leading-6 text-[#1C2E36] outline-none focus:border-[#2E6F87]"
                />
              )}

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              )}
            </div>

            <div className="border-t border-[#E2DFD7] px-6 py-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs font-medium text-[#5A6B73]">
                  Confirmar = se agrega al contexto usado por Buddy IA.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={confirmMaterial}
                    disabled={confirming || loadingPreview || markdown.trim().length < 20}
                    className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
                  >
                    {confirming ? "Confirmando..." : "Confirmar material"}
                  </button>

                  <button
                    type="button"
                    onClick={deleteMaterial}
                    disabled={deleting}
                    className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    {deleting ? "Eliminando..." : "Eliminar material"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
