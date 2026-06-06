"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type PasswordRule = {
  label: string;
  isValid: boolean;
};

function getPasswordRules(password: string): PasswordRule[] {
  return [
    {
      label: "Mínimo 8 caracteres",
      isValid: password.length >= 8,
    },
    {
      label: "Al menos una letra mayúscula",
      isValid: /[A-Z]/.test(password),
    },
    {
      label: "Al menos una letra minúscula",
      isValid: /[a-z]/.test(password),
    },
    {
      label: "Al menos un número",
      isValid: /[0-9]/.test(password),
    },
    {
      label: "Al menos un símbolo",
      isValid: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

export function UpdatePasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);

  const passwordIsValid = passwordRules.every((rule) => rule.isValid);
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;

  async function updatePassword() {
    setLoading(true);
    setMessage("");
    setError("");

    if (!passwordIsValid) {
      setError("La contraseña todavía no cumple todos los requisitos.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        if (error.code === "same_password") {
          setError("La nueva contraseña debe ser distinta a la contraseña actual.");
          return;
        }

        setError(error.message);
        return;
      }

      setMessage("Contraseña actualizada correctamente.");

      window.setTimeout(() => {
        router.push("/dashboard");
      }, 1200);
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
        Nueva contraseña
      </h2>

      <p className="mt-2 text-sm text-[#5A6B73]">
        Usa una contraseña segura con mayúsculas, minúsculas, números y símbolos.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Nueva contraseña
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setError("");
              setMessage("");
            }}
            className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#2E6F87]"
          />

          <div className="mt-3 rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#5BA8AC]">
              Requisitos de seguridad
            </p>

            <ul className="space-y-2">
              {passwordRules.map((rule) => (
                <li
                  key={rule.label}
                  className={[
                    "flex items-center gap-2 text-sm font-semibold transition",
                    rule.isValid ? "text-[#2E6F87]" : "text-[#5A6B73]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition",
                      rule.isValid
                        ? "bg-[#E0EFEF] text-[#2E6F87]"
                        : "bg-white text-[#8A969B]",
                    ].join(" ")}
                  >
                    {rule.isValid ? "✓" : "•"}
                  </span>

                  {rule.label}
                </li>
              ))}
            </ul>

            <div className="mt-3 border-t border-[#E2DFD7] pt-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#5A6B73]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#8A969B]">
                  !
                </span>

                Debe ser distinta a tu contraseña actual. Esta regla se valida al guardar.
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Confirmar nueva contraseña
          </label>

          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              setError("");
              setMessage("");
            }}
            className="w-full rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#2E6F87]"
          />

          {confirmPassword.length > 0 && (
            <p
              className={[
                "mt-2 text-sm font-semibold",
                passwordsMatch ? "text-[#2E6F87]" : "text-red-700",
              ].join(" ")}
            >
              {passwordsMatch
                ? "Las contraseñas coinciden."
                : "Las contraseñas no coinciden."}
            </p>
          )}
        </div>
      </div>

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

      <button
        type="button"
        onClick={updatePassword}
        disabled={loading || !passwordIsValid || !passwordsMatch}
        className="mt-5 rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Actualizando..." : "Actualizar contraseña"}
      </button>
    </div>
  );
}
