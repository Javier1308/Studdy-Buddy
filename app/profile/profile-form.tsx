"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileForm({
  firstName,
  lastName,
  role,
  institutionName,
}: {
  firstName: string;
  lastName: string;
  role: "student" | "tutor" | "admin";
  institutionName: string;
}) {
  const router = useRouter();

  const [currentFirstName, setCurrentFirstName] = useState(firstName);
  const [currentLastName, setCurrentLastName] = useState(lastName);
  const [currentInstitutionName, setCurrentInstitutionName] =
    useState(institutionName);

  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: currentFirstName,
          lastName: currentLastName,
          institutionName: currentInstitutionName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo actualizar el perfil.");
        return;
      }

      setMessage("Perfil actualizado correctamente.");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function sendPasswordReset() {
    setSendingReset(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo enviar el correo de recuperación.");
        return;
      }

      setMessage("Te enviamos un correo para cambiar tu contraseña.");
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setSendingReset(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
          Datos personales
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">Nombre</label>
            <input
              value={currentFirstName}
              onChange={(event) => setCurrentFirstName(event.target.value)}
              className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Apellido</label>
            <input
              value={currentLastName}
              onChange={(event) => setCurrentLastName(event.target.value)}
              className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
            />
          </div>
        </div>

        {role === "student" && (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-semibold">
              Institución educativa
            </label>
            <input
              value={currentInstitutionName}
              onChange={(event) => setCurrentInstitutionName(event.target.value)}
              className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
              placeholder="Ej: Colegio San Agustín"
            />
          </div>
        )}

        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          className="mt-5 rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <div className="rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
          Seguridad
        </h2>

        <p className="mt-2 text-sm text-[#5A6B73]">
          Para cambiar tu contraseña, te enviaremos un enlace seguro a tu correo verificado.
        </p>

        <button
          type="button"
          onClick={sendPasswordReset}
          disabled={sendingReset}
          className="mt-5 rounded-lg border border-[#E2DFD7] bg-white px-5 py-3 text-sm font-semibold text-[#1C2E36] hover:bg-[#E0EFEF] disabled:opacity-60"
        >
          {sendingReset ? "Enviando..." : "Enviar correo para cambiar contraseña"}
        </button>
      </div>

      {message && (
        <p className="rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
          {message}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
