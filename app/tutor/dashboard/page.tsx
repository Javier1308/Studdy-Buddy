import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getProfileDisplayName } from "@/lib/profiles/display-name";

type AssignedStudent = {
  id: string;
  displayName: string;
  email: string;
  courses: string[];
};

export default async function TutorDashboardPage() {
  await getApprovedUserOrRedirect();
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: tutor } = await supabase
    .from("tutors")
    .select("id")
    .eq("profile_id", user?.id)
    .single();

  let assignedStudents: AssignedStudent[] = [];

  if (tutor) {
    const admin = createAdminClient();

    const { data: assignments } = await admin
      .from("student_course_tutors")
      .select(
        `
        id,
        students (
          id,
          profiles (
            
            email
          )
        ),
        courses (
          id,
          name
        )
      `
      )
      .eq("tutor_id", tutor.id)
      .eq("is_active", true)
      .order("assigned_at", { ascending: false });

    const studentsMap = new Map<string, AssignedStudent>();

    for (const assignment of assignments ?? []) {
      const student = Array.isArray(assignment.students)
        ? assignment.students[0]
        : assignment.students;

      if (!student) continue;

      const profile = Array.isArray(student.profiles)
        ? student.profiles[0]
        : student.profiles;

      if (!profile?.email) continue;

      const course = Array.isArray(assignment.courses)
        ? assignment.courses[0]
        : assignment.courses;

      const existing = studentsMap.get(student.id);

      if (existing) {
        if (course?.name && !existing.courses.includes(course.name)) {
          existing.courses.push(course.name);
        }
      } else {
        studentsMap.set(student.id, {
          id: student.id,
          displayName: getProfileDisplayName(profile),
          email: profile.email,
          courses: course?.name ? [course.name] : [],
        });
      }
    }

    assignedStudents = Array.from(studentsMap.values());
  }

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
            Panel de tutor
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            Tus estudiantes asignados.
          </h1>

          <p className="mt-3 text-[#5A6B73]">
            Revisa el perfil académico de cada estudiante, sus cursos y su skill.md.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="border-b border-[#E2DFD7] p-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
              Estudiantes
            </h2>
            <p className="mt-2 text-sm text-[#5A6B73]">
              Se muestran alumnos que tienen al menos un curso asignado contigo.
            </p>
          </div>

          <div className="divide-y divide-[#E2DFD7]">
            {assignedStudents.map((student) => (
              <div
                key={student.id}
                className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold">
                    {getProfileDisplayName(student)}
                  </p>

                  <p className="text-sm text-[#5A6B73]">{student.email}</p>

                  <p className="mt-2 text-xs font-semibold text-[#5BA8AC]">
                    Cursos:{" "}
                    {student.courses.length > 0
                      ? student.courses.join(", ")
                      : "sin cursos visibles"}
                  </p>
                </div>

                <Link
                  prefetch={false}
                  href={`/tutor/students/${student.id}`}
                  className="rounded-lg bg-[#2E6F87] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1F4E60]"
                >
                  Ver estudiante
                </Link>
              </div>
            ))}

            {assignedStudents.length === 0 && (
              <div className="p-6 text-sm text-[#5A6B73]">
                Todavía no tienes estudiantes asignados.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
