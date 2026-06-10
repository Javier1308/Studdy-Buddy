import { createAdminClient } from "@/lib/supabase/admin";

type ApprovedUser = {
  id: string;
  role: "admin" | "student" | "tutor";
};

export type StudentSessionAccessContext = {
  sessionId: string;
  studentId: string;
  courseId: string;
  title: string;
  messageCount: number;
};

export async function getStudentSessionAccessContext({
  user,
  sessionId,
}: {
  user: ApprovedUser;
  sessionId: string;
}): Promise<StudentSessionAccessContext | null> {
  if (user.role !== "student") {
    return null;
  }

  const admin = createAdminClient();

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!student) {
    return null;
  }

  const { data: session } = await admin
    .from("chat_sessions")
    .select("id, student_id, course_id, title, message_count, deleted_at")
    .eq("id", sessionId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (!session || session.deleted_at) {
    return null;
  }

  const { data: assignment } = await admin
    .from("student_course_tutors")
    .select("id")
    .eq("student_id", student.id)
    .eq("course_id", session.course_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!assignment) {
    return null;
  }

  return {
    sessionId: session.id,
    studentId: student.id,
    courseId: session.course_id,
    title: session.title,
    messageCount: session.message_count,
  };
}
