"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No pudimos crear tu cuenta.");
        return;
      }

      router.push("/login");
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#1C2E36]">
      <section className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_12px_32px_rgba(46,111,135,.14)]">
          <div className="mb-8">
            <div className="mb-6 inline-block -rotate-[6deg] bg-[#2E6F87] px-4 py-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
                Studdy Buddy
              </p>
            </div>

            <h1 className="text-4xl font-extrabold tracking-[-0.04em]">
              Crea tu cuenta.
            </h1>

            <p className="mt-3 text-sm font-medium leading-6 text-[#5A6B73]">
              Empezaremos con una cuenta de estudiante. Los roles de tutor y admin
              se asignan después.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Nombre
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Tu nombre"
                className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#2E6F87]"
              />
            </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Apellido
                </label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm"
                  placeholder="Ej: Olivares"
                />
              </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Correo
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#2E6F87]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#2E6F87]"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#2E6F87] px-4 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(46,111,135,.10)] hover:bg-[#1F4E60] disabled:opacity-60"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-[#5A6B73]">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-[#2E6F87] hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
