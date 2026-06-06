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
    courseId: string;
  }>;
};

export default async function TutorCourseSurveyPage({ params }: PageProps) {
  const approvedUser = await getApprovedUserOrRedirect();
  const { studentId, courseId } = await params;
  const hasStudentCourseAccess = await canAccessStudentCourse({
    user: approvedUser,
    studentId,
    courseId,
  });

  if (!hasStudentCourseAccess) {
    notFound();
  }


  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: tutor } = await supabase
    .from("tutors")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!tutor) notFound();

  const admin = createAdminClient();

  const { data: assignment } = await admin
    .from("student_course_tutors")
    .select(`
      id,
      students (
        profiles (
          
          email
        ),
        grades (
          display_name
        )
      ),
      courses (
        id,
        name
      )
    `)
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .eq("tutor_id", tutor.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!assignment) notFound();

  const { count } = await admin
    .from("tutor_feedback_surveys")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  if ((count ?? 0) >= 3) {
    const student = Array.isArray(assignment.students)
      ? assignment.students[0]
      : assignment.students;

    const profile = Array.isArray(student?.profiles)
      ? student?.profiles[0]
      : student?.profiles;

    const course = Array.isArray(assignment.courses)
      ? assignment.courses[0]
      : assignment.courses;

    return (
      <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
        <section className="mx-auto max-w-3xl">
          <a
            href={`/tutor/students/${studentId}`}
            className="mb-6 inline-block rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#E0EFEF]"
          >
            ← Volver al estudiante
          </a>

          <div className="rounded-2xl border border-[#E2DFD7] bg-white p-8 shadow-[0_10px_30px_rgba(28,46,54,.10)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
              Límite alcanzado
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">
              Este curso ya tiene 3 encuestas.
            </h1>

            <p className="mt-4 text-sm leading-relaxed text-[#5A6B73]">
              No puedes crear una nueva encuesta para{" "}
              <strong>{getProfileDisplayName(profile, "este alumno")}</strong> en{" "}
              <strong>{course?.name || "este curso"}</strong> porque ya alcanzó
              el máximo permitido de 3 versiones.
            </p>

            <p className="mt-3 text-sm leading-relaxed text-[#5A6B73]">
              Para crear una nueva, primero elimina una encuesta anterior que no
              esté activa.
            </p>

            <a
              href={`/tutor/students/${studentId}`}
              className="mt-6 inline-block rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60]"
            >
              Ver encuestas del estudiante
            </a>
          </div>
        </section>
      </main>
    );
  }

  const student = Array.isArray(assignment.students)
    ? assignment.students[0]
    : assignment.students;

  const profile = Array.isArray(student?.profiles)
    ? student?.profiles[0]
    : student?.profiles;

  const grade = Array.isArray(student?.grades)
    ? student?.grades[0]
    : student?.grades;

  const course = Array.isArray(assignment.courses)
    ? assignment.courses[0]
    : assignment.courses;

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <BackButton
          label="Volver al estudiante"
          fallbackHref={`/tutor/students/${studentId}`}
        />

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Nueva encuesta por curso
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {getProfileDisplayName(profile, "Alumno sin nombre")}
          </h1>

          <p className="mt-3 text-[#5A6B73]">{profile?.email}</p>

          <p className="mt-2 text-sm font-semibold text-[#5BA8AC]">
            Curso: {course?.name ?? "Curso sin nombre"} · Grado:{" "}
            {grade?.display_name ?? "sin grado"}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <SurveyForm studentId={studentId} courseId={courseId} />
        </div>
      </section>
    </main>
  );
}
