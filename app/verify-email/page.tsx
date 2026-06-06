import { LogoutButton } from "@/components/auth/logout-button";
import { ResendVerificationButton } from "./resend-verification-button";

export default function VerifyEmailPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-xl rounded-2xl border border-[#E2DFD7] bg-white p-8 shadow-[0_10px_30px_rgba(28,46,54,.10)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
          Verificación requerida
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
          Verifica tu correo para continuar.
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-[#5A6B73]">
          Te enviamos un correo de verificación. Debes verificarlo antes de acceder a Studdy Buddy.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ResendVerificationButton />
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
