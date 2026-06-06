import { UpdatePasswordForm } from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-xl">
        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Seguridad
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
            Cambiar contraseña
          </h1>

          <p className="mt-3 text-sm text-[#5A6B73]">
            Ingresa una nueva contraseña para tu cuenta.
          </p>
        </div>

        <UpdatePasswordForm />
      </section>
    </main>
  );
}
