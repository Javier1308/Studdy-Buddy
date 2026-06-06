import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#1C2E36]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-12">
        <div className="mb-10 inline-block w-fit -rotate-[6deg] bg-[#2E6F87] px-5 py-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
            Studdy Buddy
          </p>
        </div>

        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <h1 className="max-w-3xl text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] md:text-7xl">
              Aprende con un buddy que te conoce.
            </h1>

            <p className="max-w-xl text-lg font-medium leading-8 text-[#5A6B73]">
              Tutorías personalizadas con conexión humana, apoyadas por una
              plataforma online y Buddy IA para reforzar lo aprendido entre
              sesiones.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/register"
                className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(46,111,135,.10)] hover:bg-[#1F4E60]"
              >
                Crear cuenta
              </Link>

              <Link
                href="/login"
                className="rounded-lg border border-[#E2DFD7] bg-white px-5 py-3 text-sm font-semibold text-[#1C2E36] shadow-[0_1px_2px_rgba(46,111,135,.06)] hover:bg-[#E0EFEF]"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-[#2E6F87] p-8 shadow-[0_12px_32px_rgba(46,111,135,.14)]">
            <div className="mb-6 inline-block -rotate-[6deg] bg-[#5BA8AC] px-4 py-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">
                Próxima sesión
              </p>
            </div>

            <h2 className="text-3xl font-extrabold tracking-[-0.03em] text-white">
              Álgebra · ecuaciones lineales
            </h2>

            <p className="mt-3 max-w-md text-sm font-medium leading-6 text-[#E0EFEF]">
              Hoy · 17:00 — 18:00 · con Lucía Mora
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button className="rounded-lg bg-[#D8C447] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
                ✦ Entrar a la sesión
              </button>
              <button className="rounded-lg bg-white/10 px-4 py-3 text-sm font-semibold text-white">
                Ver materiales
              </button>
            </div>

            <div className="absolute -bottom-8 -right-6 h-36 w-36 rounded-t-full rounded-b-[40%] bg-[#5BA8AC] opacity-90" />
            <div className="absolute bottom-16 right-10 text-5xl font-extrabold text-[#2E6F87]">
              dd
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
