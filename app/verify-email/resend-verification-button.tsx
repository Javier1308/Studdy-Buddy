"use client";

import { useState } from "react";

export function ResendVerificationButton() {
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function resend() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo reenviar el correo.");

        if (data.remainingSeconds) {
          setCooldown(data.remainingSeconds);
          startCooldown(data.remainingSeconds);
        }

        return;
      }

      setMessage("Correo de verificación reenviado.");
      setCooldown(60);
      startCooldown(60);
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function startCooldown(seconds: number) {
    let remaining = seconds;

    const interval = window.setInterval(() => {
      remaining -= 1;
      setCooldown(Math.max(remaining, 0));

      if (remaining <= 0) {
        window.clearInterval(interval);
      }
    }, 1000);
  }

  return (
    <div>
      <button
        type="button"
        onClick={resend}
        disabled={loading || cooldown > 0}
        className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Enviando..."
          : cooldown > 0
            ? `Reenviar en ${cooldown}s`
            : "Reenviar verificación"}
      </button>

      {message && (
        <p className="mt-3 rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
