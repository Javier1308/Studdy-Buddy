import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SurveyForm } from "./survey-form";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getProfileDisplayName } from "@/lib/profiles/display-name";
import { canAccessStudentCourse } from "@/lib/auth/course-access";

type PageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

export default async function TutorStudentSurveyPage({ params }: PageProps) {
  const approvedUser = await getApprovedUserOrRedirect();
  const { studentId } = await params;
  const hasStudentCourseAccess = await canAccessStudentCourse({
    user: approvedUser,
    studentId,
  });

  if (!hasStudentCourseAccess) {
    notFound();
  }


  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data: tutor } = await supabase
    .from("tutors")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!tutor) {
    notFound();
  }

  const admin = createAdminClient();

  const { data: accessAssignment } = await admin
    .from("student_course_tutors")
    .select("id")
    .eq("student_id", studentId)
    .eq("tutor_id", tutor.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!accessAssignment) {
    notFound();
  }

  const { data: student } = await admin
    .from("students")
    .select(`
      id,
      profiles (
        
        email
      ),
      grades (
        display_name
      )
    `)
    .eq("id", studentId)
    .single();

  if (!student) {
    notFound();
  }

  const profile = Array.isArray(student.profiles)
    ? student.profiles[0]
    : student.profiles;

  const grade = Array.isArray(student.grades)
    ? student.grades[0]
    : student.grades;

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <BackButton
          label="Volver al estudiante"
          fallbackHref={`/tutor/students/${studentId}`}
        />

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Nueva encuesta
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {getProfileDisplayName(profile, "Alumno sin nombre")}
          </h1>

          <p className="mt-3 text-[#5A6B73]">{profile?.email}</p>

          <p className="mt-2 text-sm font-semibold text-[#5BA8AC]">
            Grado: {grade?.display_name ?? "sin grado asignado"}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <SurveyForm studentId={studentId} />
        </div>

        <Link
          prefetch={false}
          href={`/tutor/students/${studentId}`}
          className="mt-6 inline-block rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#E0EFEF]"
        >
          Volver sin guardar
        </Link>
      </section>
    </main>
  );
}
