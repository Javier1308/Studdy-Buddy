import { LogoutButton } from "@/components/auth/logout-button";

export default function PendingApprovalPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-xl rounded-2xl border border-[#E2DFD7] bg-white p-8 shadow-[0_10px_30px_rgba(28,46,54,.10)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
          Cuenta pendiente
        </p>

        <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
          Tu cuenta está pendiente de aprobación.
        </h1>

        <p className="mt-4 text-sm leading-relaxed text-[#5A6B73]">
          Tu correo ya fue verificado, pero un administrador debe aprobar tu cuenta antes de darte acceso.
        </p>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
