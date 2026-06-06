import { notFound } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GenerateSkillButton } from "./generate-skill-button";
import { PromoteSkillButton } from "./promote-skill-button";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getProfileDisplayName } from "@/lib/profiles/display-name";
import { canAccessStudentCourse } from "@/lib/auth/course-access";

type PageProps = {
  params: Promise<{
    studentId: string;
    surveyId: string;
  }>;
};

export default async function TutorSurveyDetailPage({ params }: PageProps) {
  const approvedUser = await getApprovedUserOrRedirect();
  const { studentId, surveyId } = await params;
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

  const { data: survey } = await admin
    .from("tutor_feedback_surveys")
    .select(
      "id, student_id, tutor_id, answers, notes, generated_skill_md, generation_status, is_promoted, created_at"
    )
    .eq("id", surveyId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!survey) {
    notFound();
  }

  const { data: student } = await admin
    .from("students")
    .select(`
      id,
      profiles (
        
        email
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

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <BackButton
          label="Volver al estudiante"
          fallbackHref={`/tutor/students/${studentId}`}
        />

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Encuesta del estudiante
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {getProfileDisplayName(profile, "Alumno sin nombre")}
          </h1>

          <p className="mt-3 text-[#5A6B73]">{profile?.email}</p>

          <p className="mt-2 text-sm text-[#5A6B73]">
            Estado: <strong>{survey.generation_status}</strong> · Promovida:{" "}
            <strong>{survey.is_promoted ? "sí" : "no"}</strong>
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
            Respuestas registradas
          </h2>

          <pre className="mt-4 overflow-auto rounded-lg bg-[#F7F5F0] p-4 text-sm text-[#1C2E36]">
            {JSON.stringify(survey.answers ?? {}, null, 2)}
          </pre>

          {survey.notes && (
            <div className="mt-4 rounded-lg bg-[#F7F5F0] p-4 text-sm">
              <p className="font-bold">Notas del tutor</p>
              <p className="mt-2 whitespace-pre-wrap text-[#5A6B73]">
                {survey.notes}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="flex flex-col gap-3 md:flex-row">
            <GenerateSkillButton surveyId={survey.id} />

            {survey.generated_skill_md && !survey.is_promoted && (
              <PromoteSkillButton surveyId={survey.id} studentId={studentId} />
            )}
          </div>

          {survey.generated_skill_md ? (
            <pre className="mt-5 max-h-[500px] overflow-auto whitespace-pre-wrap rounded-lg bg-[#F7F5F0] p-4 text-sm">
              {survey.generated_skill_md}
            </pre>
          ) : (
            <p className="mt-5 text-sm text-[#5A6B73]">
              Aún no se ha generado un skill.md para esta encuesta.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
