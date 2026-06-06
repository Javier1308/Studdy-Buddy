"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

function previewSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreateCourseForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const slug = previewSlug(name);

  async function handleCreate() {
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo crear el curso.");
        return;
      }

      setName("");
      setMessage(`Curso creado correctamente: ${data.course?.slug ?? ""}`);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
        Crear curso
      </h2>

      <p className="mt-2 text-sm text-[#5A6B73]">
        Crea categorías/cursos que luego el estudiante podrá seleccionar al subir materiales.
      </p>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold">
          Nombre del curso
        </label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej: Matemática Financiera"
          className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
        />

        {slug && (
          <p className="mt-2 text-xs font-semibold text-[#5A6B73]">
            Slug generado: <span className="text-[#2E6F87]">{slug}</span>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={loading || !name.trim()}
        className="mt-5 rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
      >
        {loading ? "Creando..." : "Crear curso"}
      </button>

      {message && (
        <p className="mt-4 rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
