import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";

export default async function StudentDashboardPage() {
  await getApprovedUserOrRedirect();
  const supabase = await createServerSupabaseClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: student } = await supabase
    .from("students")
    .select("id, onboarding_completed_at")
    .eq("profile_id", user.id)
    .single();

  if (!student?.onboarding_completed_at) {
    redirect("/student/onboarding");
  }

  const { data: assignments } = student
    ? await admin
        .from("student_course_tutors")
        .select(`
          id,
          active_skill_md,
          courses (
            id,
            name,
            slug
          )
        `)
        .eq("student_id", student.id)
        .eq("is_active", true)
    : { data: [] };

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="inline-block -rotate-[6deg] bg-[#2E6F87] px-4 py-2">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
              Studdy Buddy
            </p>
          </div>

          
          <a
            href="/profile"
            className="rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#F7F5F0]"
          >
            Ver perfil
          </a>

          <LogoutButton />
        </div>

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Panel de estudiante
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            Tu espacio de estudio.
          </h1>

          <p className="mt-3 text-[#5A6B73]">
            Aquí verás los cursos que tu tutor te asignó.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="border-b border-[#E2DFD7] p-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
              Cursos asignados
            </h2>
          </div>

          <div className="divide-y divide-[#E2DFD7]">
            {(assignments ?? []).map((assignment: any) => {
              const course = Array.isArray(assignment.courses)
                ? assignment.courses[0]
                : assignment.courses;

              if (!course) return null;

              const hasActiveSkill = Boolean(assignment.active_skill_md);

              return (
                <div
                  key={assignment.id}
                  className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-bold">{course.name}</p>

                    <p className="mt-1 text-sm text-[#5A6B73]">
                      Personalización:{" "}
                      <strong>activa</strong>
                      {hasActiveSkill && (
                        <>
                          {" · "}
                          Enriquecimiento del tutor:{" "}
                          <strong>activo</strong>
                        </>
                      )}
                    </p>
                  </div>

                  <Link
                    prefetch={false}
                    href={`/student/courses/${course.id}`}
                    className="rounded-lg bg-[#2E6F87] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F4E60]"
                  >
                    Ver curso
                  </Link>
                </div>
              );
            })}

            {(assignments ?? []).length === 0 && (
              <div className="p-6 text-sm text-[#5A6B73]">
                Todavía no tienes cursos asignados.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
