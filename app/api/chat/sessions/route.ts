import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";

const getSchema = z.object({
  courseId: z.string().uuid(),
});

const createSchema = z.object({
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

export async function POST(request: Request) {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can create chat sessions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { courseId } = parsed.data;

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

    // Create empty session with default title — atomically checks max-3 limit
    // and inserts via RPC to eliminate the race condition between count and insert.
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const defaultTitle = `Chat - ${dateStr}`;

    const { data: rpcResult, error: rpcError } = await admin.rpc(
      "create_chat_session_with_limit",
      {
        p_student_id: studentCourseAccess.studentId,
        p_course_id: courseId,
        p_title: defaultTitle,
      }
    );

    if (rpcError) {
      return NextResponse.json(
        { error: "internal_error", message: "Could not create chat session." },
        { status: 500 }
      );
    }

    if (rpcResult?.error === "session_limit_reached") {
      return NextResponse.json(
        {
          error: "session_limit_reached",
          message: "Maximum 3 active sessions per course.",
        },
        { status: 409 }
      );
    }

    if (!rpcResult?.success || !rpcResult?.session_id) {
      return NextResponse.json(
        {
          error: "session_create_failed",
          message: "Could not create chat session.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: rpcResult.session_id as string,
        title: defaultTitle,
      },
    });
  } catch (error) {
    console.error("CHAT_SESSIONS_POST_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected error." },
      { status: 500 }
    );
  }
}
