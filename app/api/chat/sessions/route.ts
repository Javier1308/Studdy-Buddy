import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";

const getSchema = z.object({
  courseId: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can list chat sessions." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { error: "invalid_query", message: "courseId query parameter is required." },
        { status: 400 }
      );
    }

    const parsed = getSchema.safeParse({ courseId });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_query", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const studentCourseAccess = await getStudentCourseAccessContext({
      user: approvedUser,
      courseId,
    });

    if (!studentCourseAccess) {
      return NextResponse.json(
        { error: "course_not_found", message: "Course not found." },
        { status: 404 }
      );
    }

    const admin = createAdminClient();

    const { data: sessions } = await admin
      .from("chat_sessions")
      .select("id, title, message_count, last_message_at")
      .eq("student_id", studentCourseAccess.studentId)
      .eq("course_id", courseId)
      .is("deleted_at", null)
      .order("last_message_at", { ascending: false });

    const sessionsWithPreview = await Promise.all(
      (sessions || []).map(async (session) => {
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

    return NextResponse.json({
      sessions: sessionsWithPreview,
      count: sessionsWithPreview.length,
    });
  } catch (error) {
    console.error("CHAT_SESSIONS_GET_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected error." },
      { status: 500 }
    );
  }
}
