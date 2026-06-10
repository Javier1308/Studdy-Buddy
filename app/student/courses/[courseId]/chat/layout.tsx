import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { BackButton } from "@/components/navigation/back-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";
import { SessionList } from "./session-list";
import { SessionActions } from "./session-actions";

export type ChatSession = {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    courseId: string;
  }>;
};

export default async function ChatLayout({ children, params }: LayoutProps) {
  const approvedUser = await getApprovedUserOrRedirect();
  const { courseId } = await params;

  const studentCourseAccess = await getStudentCourseAccessContext({
    user: approvedUser,
    courseId,
  });

  if (!studentCourseAccess) {
    notFound();
  }

  const admin = createAdminClient();

  const [courseResult, studentResult] = await Promise.all([
    admin
      .from("courses")
      .select("id, name")
      .eq("id", courseId)
      .is("deleted_at", null)
      .single(),

    admin
      .from("students")
      .select("id, active_personalization_md")
      .eq("profile_id", approvedUser.id)
      .maybeSingle(),
  ]);

  const course = courseResult.data;
  const student = studentResult.data;

  if (!course || !student) {
    notFound();
  }

  if (!student.active_personalization_md) {
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

  // Fetch active sessions server-side with last message preview
  const { data: rawSessions } = await admin
    .from("chat_sessions")
    .select("id, title, message_count, last_message_at")
    .eq("student_id", studentCourseAccess.studentId)
    .eq("course_id", courseId)
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false });

  const sessions: ChatSession[] = await Promise.all(
    (rawSessions || []).map(async (session) => {
      const { data: latestMessage } = await admin
        .from("chat_messages")
        .select("content")
        .eq("session_id", session.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        id: session.id,
        title: session.title,
        messageCount: session.message_count,
        lastMessageAt: session.last_message_at,
        lastMessagePreview: latestMessage?.content?.slice(0, 100) ?? null,
      };
    })
  );

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-7xl">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-10 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
                Chats
              </p>

              <SessionActions courseId={courseId} sessionCount={sessions.length} />

              <SessionList courseId={courseId} sessions={sessions} />
            </div>
          </aside>

          {/* Main content */}
          <div className="lg:col-span-3">{children}</div>
        </div>
      </section>
    </main>
  );
}
