import Link from "next/link";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";

function getDashboardPath(role: string) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "tutor") return "/tutor/dashboard";
  if (role === "student") return "/student/dashboard";

  return "/dashboard";
}

export default async function NotFoundPage() {
  let dashboardPath = "/dashboard";

  try {
    const user = await getApprovedUserOrRedirect();
    dashboardPath = getDashboardPath(user.role);
  } catch {
    dashboardPath = "/login";
  }

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center pt-24 text-center">
        <div className="mb-8 rotate-[-4deg] bg-[#2E6F87] px-5 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-white shadow-sm">
          Studdy Buddy
        </div>

        <div className="w-full rounded-2xl border border-[#E2DFD7] bg-white p-8 shadow-[0_8px_24px_rgba(46,111,135,.10)] md:p-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Página no disponible
          </p>

          <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] md:text-5xl">
            No encontramos esta sección.
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#5A6B73] md:text-base">
            Puede que el enlace no exista, que el curso ya no esté asignado o que no tengas acceso a este contenido.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={dashboardPath}
              className="inline-flex items-center justify-center rounded-xl bg-[#2E6F87] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#24586B]"
            >
              Volver al panel
            </Link>

            <Link
              href="/profile"
              className="inline-flex items-center justify-center rounded-xl border border-[#E2DFD7] bg-[#F7F5F0] px-5 py-3 text-sm font-extrabold text-[#1C2E36] transition hover:bg-[#EFECE5]"
            >
              Ver mi perfil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
