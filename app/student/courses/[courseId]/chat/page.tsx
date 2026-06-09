import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { BackButton } from "@/components/navigation/back-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChatBox } from "./chat-box";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

export default async function CourseChatPage({ params }: PageProps) {
  const approvedUser = await getApprovedUserOrRedirect();
  const { courseId } = await params;

  const studentCourseAccess = await getStudentCourseAccessContext({
    user: approvedUser,
    courseId,
  });

  if (!studentCourseAccess) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const admin = createAdminClient();

  const coursePromise = admin
    .from("courses")
    .select("id, name")
    .eq("id", courseId)
    .is("deleted_at", null)
    .single();

  const userPromise = supabase.auth.getUser();

  const [courseResult, userResult] = await Promise.all([
    coursePromise,
    userPromise,
  ]);

  const course = courseResult.data;
  const user = userResult.data.user;

  if (!course || !user) {
    notFound();
  }

  const student = {
    id: studentCourseAccess.studentId,
  };

  const [{ data: studentRecord }, { data: assignmentResult }, { data: contextResult }, { data: sessionResult }] = await Promise.all([
    admin
      .from("students")
      .select("id, active_personalization_md")
      .eq("profile_id", user.id)
      .maybeSingle(),

    admin
      .from("student_course_tutors")
      .select("id, tutor_id, active_skill_md, active_skill_survey_id")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .eq("is_active", true)
      .maybeSingle(),

    admin
      .from("course_contexts")
      .select("storage_path, compile_status")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .maybeSingle(),

    admin
      .from("chat_sessions")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .maybeSingle(),
  ]);

  const studentCourseTutor = assignmentResult;
  const context = contextResult;
  const session = sessionResult;

  if (!studentCourseTutor) {
    notFound();
  }

  if (!studentRecord?.active_personalization_md) {
    return (
      <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
        <section className="mx-auto max-w-3xl rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]">
            Completa tu perfil primero.
          </h1>

          <p className="mt-3 text-[#5A6B73]">
            Para usar Buddy IA necesitas completar el cuestionario de personalización. Esto nos ayudará a adaptar el estudio a tus necesidades.
          </p>

          <Link
            prefetch={false}
            href="/student/onboarding"
            className="mt-5 inline-block rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60]"
          >
            Completar perfil
          </Link>
        </section>
      </main>
    );
  }

  let initialMessages: ChatMessage[] = [];

  if (session) {
    const { data: messages } = await admin
      .from("chat_messages")
      .select("role, content, created_at")
      .eq("session_id", session.id)
      .order("created_at", { ascending: false })
      .limit(20);

    initialMessages = ((messages ?? []) as ChatMessage[])
      .filter(
        (message) => message.role === "user" || message.role === "assistant"
      )
      .reverse();
  }

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            prefetch={false}
            href={`/student/courses/${courseId}`}
            className="inline-block -rotate-[6deg] bg-[#2E6F87] px-4 py-2"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
              Studdy Buddy
            </p>
          </Link>

          <LogoutButton />
        </div>

        <BackButton
          label="Volver al curso"
          fallbackHref={`/student/courses/${courseId}`}
        />

        <div className="mb-6 rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Chat del curso
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {course.name}
          </h1>

          <p className="mt-3 text-[#5A6B73]">
            Perfil de personalización: <strong>activo</strong> · Contexto del curso:{" "}
            <strong>
              {context?.compile_status === "completed" && context?.storage_path
                ? "compilado"
                : "pendiente"}
            </strong>
            {studentCourseTutor?.active_skill_md && (
              <>
                {" · "}
                Enriquecimiento del tutor: <strong>activo</strong>
              </>
            )}
          </p>
        </div>

        <ChatBox courseId={courseId} initialMessages={initialMessages} />
      </section>
    </main>
  );
}
