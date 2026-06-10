import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";
import { ComposeState } from "./compose-state";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CourseChatPage({ params, searchParams }: PageProps) {
  const approvedUser = await getApprovedUserOrRedirect();
  const { courseId } = await params;
  const resolvedSearchParams = await searchParams;
  const isNewCompose = resolvedSearchParams["new"] === "1";

  const studentCourseAccess = await getStudentCourseAccessContext({
    user: approvedUser,
    courseId,
  });

  if (!studentCourseAccess) {
    notFound();
  }

  // If ?new=1 is present, render compose state (no redirect to existing session)
  if (isNewCompose) {
    return <ComposeState courseId={courseId} />;
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

  // No sessions exist — show compose state so the student can start their first chat
  return <ComposeState courseId={courseId} />;
}
