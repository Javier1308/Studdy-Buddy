import { LogoutButton } from "@/components/auth/logout-button";

export default function AccountRejectedPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-xl rounded-2xl border border-[#E2DFD7] bg-white p-8 shadow-[0_10px_30px_rgba(28,46,54,.10)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
          Acceso rechazado
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
          Tu cuenta no fue aprobada.
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-[#5A6B73]">
          Por ahora no tienes acceso a Studdy Buddy. Contacta al equipo administrador si crees que esto fue un error.
        </p>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
