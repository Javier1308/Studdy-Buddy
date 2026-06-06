import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "./profile-form";
import { getProfileDisplayName } from "@/lib/profiles/display-name";
import { StudentGradeChangeRequestForm, TutorGradesChangeRequestForm } from "./profile-update-request-form";

export default async function ProfilePage() {
  const approvedUser = await getApprovedUserOrRedirect();

  const supabase = await createServerSupabaseClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, email, first_name, last_name, role, approval_status"
    )
    .eq("id", approvedUser.id)
    .single();

  const [{ data: student }, { data: tutorGrades }] = await Promise.all([
    approvedUser.role === "student"
      ? admin
          .from("students")
          .select(
            `
            id,
            grade_id,
            institution_name,
            grades (
              display_name
            )
          `
          )
          .eq("profile_id", approvedUser.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    approvedUser.role === "tutor"
      ? admin
          .from("tutors")
          .select(
            `
            id,
            tutor_grades (
              grade_id,
              grades (
                display_name
              )
            )
          `
          )
          .eq("profile_id", approvedUser.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const dashboardHref =
    approvedUser.role === "admin"
      ? "/admin/dashboard"
      : approvedUser.role === "tutor"
        ? "/tutor/dashboard"
        : "/student/dashboard";

  const grade = Array.isArray(student?.grades)
    ? student?.grades[0]
    : student?.grades;

  const tutorGradeNames =
    tutorGrades?.tutor_grades
      ?.map((row: any) => {
        const gradeItem = Array.isArray(row.grades)
          ? row.grades[0]
          : row.grades;

        return gradeItem?.display_name;
      })
      .filter(Boolean) ?? [];

  const tutorCurrentGradeIds =
    tutorGrades?.tutor_grades
      ?.map((row: any) => row.grade_id)
      .filter((gradeId: unknown): gradeId is string => typeof gradeId === "string") ?? [];

  const [
    { data: grades },
    { data: pendingStudentGradeRequest },
    { data: pendingTutorGradesRequest },
  ] = await Promise.all([
    approvedUser.role === "student" || approvedUser.role === "tutor"
      ? admin
          .from("grades")
          .select("id, display_name")
          .order("display_name", { ascending: true })
      : Promise.resolve({ data: [] }),

    approvedUser.role === "student"
      ? admin
          .from("profile_update_requests")
          .select("id")
          .eq("profile_id", approvedUser.id)
          .eq("request_type", "student_grade_change")
          .eq("status", "pending")
          .maybeSingle()
      : Promise.resolve({ data: null }),

    approvedUser.role === "tutor"
      ? admin
          .from("profile_update_requests")
          .select("id")
          .eq("profile_id", approvedUser.id)
          .eq("request_type", "tutor_grades_change")
          .eq("status", "pending")
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={dashboardHref}
            className="inline-block -rotate-[6deg] bg-[#2E6F87] px-4 py-2"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
              Studdy Buddy
            </p>
          </Link>

          
          <Link
            href={dashboardHref}
            className="rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#F7F5F0]"
          >
            Volver al panel
          </Link>

          <LogoutButton />
        </div>

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Perfil
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {getProfileDisplayName(profile, "Usuario")}
          </h1>

          <p className="mt-3 text-[#5A6B73]">{profile?.email}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#E0EFEF] px-3 py-1 text-xs font-bold uppercase text-[#1C2E36]">
              Rol: {profile?.role}
            </span>

            <span className="rounded-full bg-[#E0EFEF] px-3 py-1 text-xs font-bold uppercase text-[#1C2E36]">
              Cuenta: {profile?.approval_status}
            </span>

            <span className="rounded-full bg-[#E0EFEF] px-3 py-1 text-xs font-bold uppercase text-[#1C2E36]">
              Email: {user?.email_confirmed_at ? "verificado" : "pendiente"}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
            Datos académicos
          </h2>

          {approvedUser.role === "student" && (
            <div className="mt-4 space-y-2 text-sm text-[#5A6B73]">
              <p>
                Grado:{" "}
                <strong>{grade?.display_name ?? "sin grado asignado"}</strong>
              </p>

              <p>
                Institución educativa:{" "}
                <strong>{student?.institution_name ?? "sin institución"}</strong>
              </p>

              <p className="rounded-lg bg-[#F7F5F0] p-4 text-xs font-semibold">
                Para cambiar tu grado o cursos asignados, debes enviar una solicitud de actualización.
              </p>

              <StudentGradeChangeRequestForm
                grades={grades ?? []}
                currentGradeId={student?.grade_id ?? null}
                hasPendingRequest={Boolean(pendingStudentGradeRequest)}
              />
            </div>
          )}

          {approvedUser.role === "tutor" && (
            <div className="mt-4 space-y-2 text-sm text-[#5A6B73]">
              <p>
                Grados que enseña:{" "}
                <strong>
                  {tutorGradeNames.length > 0
                    ? tutorGradeNames.join(", ")
                    : "sin grados asignados"}
                </strong>
              </p>

              <p className="rounded-lg bg-[#F7F5F0] p-4 text-xs font-semibold">
                Para cambiar los grados que enseñas, debes enviar una solicitud de actualización.
              </p>

              <TutorGradesChangeRequestForm
                grades={grades ?? []}
                currentGradeIds={tutorCurrentGradeIds}
                hasPendingRequest={Boolean(pendingTutorGradesRequest)}
              />
            </div>
          )}

          {approvedUser.role === "admin" && (
            <p className="mt-4 text-sm text-[#5A6B73]">
              Los datos académicos se gestionan desde el panel de administración.
            </p>
          )}
        </div>

        <ProfileForm
          firstName={profile?.first_name ?? ""}
          lastName={profile?.last_name ?? ""}
          role={approvedUser.role}
          institutionName={student?.institution_name ?? ""}
        />
      </section>
    </main>
  );
}
