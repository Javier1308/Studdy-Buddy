import { notFound } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { TutorEditForm } from "./tutor-edit-form";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getProfileDisplayName } from "@/lib/profiles/display-name";

type PageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function AdminTutorDetailPage({ params }: PageProps) {
  await getApprovedUserOrRedirect();
  const { profileId } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", profileId)
    .single();

  if (!profile || profile.role !== "tutor") {
    notFound();
  }

  const { data: tutor } = await admin
    .from("tutors")
    .select("id, profile_id")
    .eq("profile_id", profileId)
    .single();

  if (!tutor) {
    notFound();
  }

  const [{ data: grades }, { data: tutorGrades }, { data: assignments }] =
    await Promise.all([
      admin
        .from("grades")
        .select("id, display_name, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      admin
        .from("tutor_grades")
        .select("grade_id")
        .eq("tutor_id", tutor.id)
        .eq("is_active", true),
      admin
        .from("student_course_tutors")
        .select(`
          id,
          students (
            profiles (
              
              email
            )
          ),
          courses (
            name
          )
        `)
        .eq("tutor_id", tutor.id)
        .eq("is_active", true),
    ]);

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <BackButton label="Volver al admin" fallbackHref="/admin/dashboard" />

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Editar profesor
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {getProfileDisplayName(profile)}
          </h1>

          <p className="mt-3 text-[#5A6B73]">{profile.email}</p>
        </div>

        <TutorEditForm
          tutorId={tutor.id}
          grades={(grades ?? []) as { id: string; display_name: string }[]}
          initialGradeIds={(tutorGrades ?? []).map((row) => row.grade_id)}
        />

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="border-b border-[#E2DFD7] p-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
              Alumnos y cursos asignados
            </h2>
          </div>

          <div className="divide-y divide-[#E2DFD7]">
            {(assignments ?? []).map((assignment: any) => {
              const studentProfile = Array.isArray(assignment.students?.profiles)
                ? assignment.students?.profiles[0]
                : assignment.students?.profiles;

              const course = Array.isArray(assignment.courses)
                ? assignment.courses[0]
                : assignment.courses;

              return (
                <div key={assignment.id} className="p-6">
                  <p className="font-bold">
                    {getProfileDisplayName(studentProfile, "Alumno sin nombre")}
                  </p>
                  <p className="text-sm text-[#5A6B73]">
                    {studentProfile?.email}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#5BA8AC]">
                    Curso: {course?.name ?? "Curso sin nombre"}
                  </p>
                </div>
              );
            })}

            {(assignments ?? []).length === 0 && (
              <div className="p-6 text-sm text-[#5A6B73]">
                Este profesor aún no tiene alumnos/cursos asignados.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
