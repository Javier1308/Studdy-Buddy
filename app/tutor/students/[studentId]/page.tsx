import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getProfileDisplayName } from "@/lib/profiles/display-name";
import { canAccessStudentCourse } from "@/lib/auth/course-access";

type PageProps = {
  params: Promise<{
    studentId: string;
  }>;
};

type CourseAssignmentCard = {
  assignmentId: string;
  courseId: string;
  courseName: string;
  activeSkillSurveyId: string | null;
  hasActiveSkill: boolean;
  surveyCount: number;
  surveys: {
    id: string;
    generation_status: string;
    is_promoted: boolean;
    isActiveForCourse: boolean;
    created_at: string;
  }[];
};

export default async function TutorStudentPage({ params }: PageProps) {
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

  const [{ data: student }, { data: assignments }, { data: surveys }] =
    await Promise.all([
      admin
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
        .single(),

      admin
        .from("student_course_tutors")
        .select(`
          id,
          course_id,
          active_skill_md,
          active_skill_survey_id,
          courses (
            id,
            name
          )
        `)
        .eq("student_id", studentId)
        .eq("tutor_id", tutor.id)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false }),

      admin
        .from("tutor_feedback_surveys")
        .select("id, course_id, generation_status, is_promoted, created_at")
        .eq("student_id", studentId)
        .eq("tutor_id", tutor.id)
        .order("created_at", { ascending: false }),
    ]);

  if (!student) {
    notFound();
  }

  const profile = Array.isArray(student.profiles)
    ? student.profiles[0]
    : student.profiles;

  const grade = Array.isArray(student.grades)
    ? student.grades[0]
    : student.grades;

  const courseCards: CourseAssignmentCard[] = (assignments ?? [])
    .map((assignment: any) => {
      const course = Array.isArray(assignment.courses)
        ? assignment.courses[0]
        : assignment.courses;

      if (!course) return null;

      const activeSkillSurveyId = assignment.active_skill_survey_id ?? null;

      const courseSurveys = (surveys ?? [])
        .filter((survey) => survey.course_id === assignment.course_id)
        .map((survey) => ({
          ...survey,
          isActiveForCourse: activeSkillSurveyId === survey.id,
        }));

      return {
        assignmentId: assignment.id,
        courseId: course.id,
        courseName: course.name,
        activeSkillSurveyId,
        hasActiveSkill: Boolean(activeSkillSurveyId && assignment.active_skill_md),
        surveyCount: courseSurveys.length,
        surveys: courseSurveys,
      };
    })
    .filter(Boolean) as CourseAssignmentCard[];

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <Link
          prefetch={false}
          href="/tutor/dashboard"
          className="mb-6 inline-block rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#E0EFEF]"
        >
          ← Volver al panel
        </Link>

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Estudiante asignado
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {getProfileDisplayName(profile)}
          </h1>

          <p className="mt-3 text-[#5A6B73]">{profile?.email}</p>

          <p className="mt-2 text-sm font-semibold text-[#5BA8AC]">
            Grado: {grade?.display_name ?? "sin grado asignado"}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="border-b border-[#E2DFD7] p-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
              Cursos y perfiles por curso
            </h2>

            <p className="mt-2 text-sm text-[#5A6B73]">
              Cada curso puede tener hasta 3 encuestas/skills. Solo una skill puede estar activa por curso.
            </p>
          </div>

          <div className="divide-y divide-[#E2DFD7]">
            {courseCards.map((course) => {
              const limitReached = course.surveyCount >= 3;

              return (
                <div key={course.assignmentId} className="p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xl font-extrabold tracking-[-0.03em]">
                        {course.courseName}
                      </p>

                      <p className="mt-2 text-sm text-[#5A6B73]">
                        Encuestas:{" "}
                        <strong>{course.surveyCount}/3</strong> · Skill activa:{" "}
                        <strong>{course.hasActiveSkill ? "sí" : "no"}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end">
                      {limitReached ? (
                        <div className="group relative inline-flex">
                          <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            className="cursor-not-allowed rounded-lg border border-[#D8D2C7] bg-[#E2DFD7] px-4 py-3 text-sm font-semibold text-[#5A6B73] opacity-80"
                          >
                            Nueva encuesta
                          </button>

                          <div className="pointer-events-none absolute right-0 top-full z-20 mt-3 w-72 translate-y-1 rounded-xl border border-[#E2DFD7] bg-white px-4 py-3 text-left text-xs font-semibold leading-relaxed text-[#1C2E36] opacity-0 shadow-[0_10px_30px_rgba(28,46,54,.16)] transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100">
                            <div className="absolute -top-1.5 right-6 h-3 w-3 rotate-45 border-l border-t border-[#E2DFD7] bg-white" />
                            Límite alcanzado: este curso ya tiene 3 encuestas. Elimina una encuesta anterior no activa para crear una nueva.
                          </div>
                        </div>
                      ) : (
                        <Link
                          prefetch={false}
                          href={`/tutor/students/${studentId}/courses/${course.courseId}/survey`}
                          className="rounded-lg bg-[#2E6F87] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60]"
                        >
                          Nueva encuesta
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 rounded-lg bg-[#F7F5F0] p-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#5BA8AC]">
                      Encuestas del curso
                    </h3>

                    <div className="mt-3 space-y-3">
                      {course.surveys.map((survey) => (
                        <div
                          key={survey.id}
                          className="flex flex-col gap-3 rounded-lg bg-white p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-bold">
                              Encuesta del{" "}
                              {new Date(survey.created_at).toLocaleDateString("es-PE")}
                            </p>

                            <p className="text-sm text-[#5A6B73]">
                              Estado: {survey.generation_status} · Activa:{" "}
                              {survey.isActiveForCourse ? "sí" : "no"}
                            </p>
                          </div>

                          <Link
                            prefetch={false}
                            href={`/tutor/students/${studentId}/courses/${course.courseId}/surveys/${survey.id}`}
                            className="rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold hover:bg-[#E0EFEF]"
                          >
                            Ver encuesta
                          </Link>
                        </div>
                      ))}

                      {course.surveys.length === 0 && (
                        <p className="text-sm text-[#5A6B73]">
                          Todavía no hay encuestas para este curso.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {courseCards.length === 0 && (
              <div className="p-6 text-sm text-[#5A6B73]">
                No tienes cursos activos con este estudiante.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
