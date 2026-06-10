import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
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

  const admin = createAdminClient();

  const { data: mostRecentSession } = await admin
    .from("chat_sessions")
    .select("id")
    .eq("student_id", studentCourseAccess.studentId)
    .eq("course_id", courseId)
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mostRecentSession) {
    redirect(`/student/courses/${courseId}/chat/${mostRecentSession.id}`);
  }

  // No sessions exist — render an empty state inside the layout (sidebar stays visible).
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
      <p className="text-sm text-[#5A6B73]">
        Crea un nuevo chat para empezar.
      </p>
    </div>
  );
}
