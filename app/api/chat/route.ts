import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";
import { getStudentSessionAccessContext } from "@/lib/auth/session-access";

const schema = z.object({
  courseId: z.string().uuid(),
  message: z.string().min(1).max(4000),
  sessionId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can use chat." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { courseId, message, sessionId } = parsed.data;

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

    const student = {
      id: studentCourseAccess.studentId,
    };

    // Check personalization early to avoid creating phantom sessions
    const { data: studentRecord } = await admin
      .from("students")
      .select("id, active_personalization_md")
      .eq("profile_id", approvedUser.id)
      .maybeSingle();

    if (!studentRecord?.active_personalization_md) {
      return NextResponse.json(
        {
          error: "personalization_not_complete",
          message: "Complete your personalization profile before using chat.",
        },
        { status: 403 }
      );
    }

    // Handle session validation/creation
    let resolvedSessionId: string;

    if (sessionId) {
      // Validate ownership of existing session
      const sessionAccess = await getStudentSessionAccessContext({
        user: approvedUser,
        sessionId,
      });

      if (!sessionAccess) {
        return NextResponse.json(
          { error: "session_not_found", message: "Session not found." },
          { status: 404 }
        );
      }

      // Verify session belongs to this course
      if (sessionAccess.courseId !== courseId) {
        return NextResponse.json(
          { error: "session_not_found", message: "Session not found." },
          { status: 404 }
        );
      }

      resolvedSessionId = sessionId;
    } else {
      // Create new session — atomically checks max-3 limit and inserts via RPC
      // to eliminate the race condition between a count check and insert.
      const generateTitle = (text: string): string => {
        const trimmed = text.trim();
        if (trimmed.length <= 60) return trimmed;

        const truncated = trimmed.slice(0, 60);
        const lastSpace = truncated.lastIndexOf(" ");
        return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
      };

      const title = generateTitle(message);

      const { data: rpcResult, error: rpcError } = await admin.rpc(
        "create_chat_session_with_limit",
        {
          p_student_id: student.id,
          p_course_id: courseId,
          p_title: title,
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

      resolvedSessionId = rpcResult.session_id as string;
    }

    const [{ data: course }, { data: studentCourseTutor }, { data: context }] =
      await Promise.all([
        admin
          .from("courses")
          .select("id, name")
          .eq("id", courseId)
          .is("deleted_at", null)
          .single(),

        admin
          .from("student_course_tutors")
          .select("id, active_skill_md")
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
      ]);

    if (!course || !studentCourseTutor) {
      return NextResponse.json(
        { error: "course_not_found", message: "Course not found." },
        { status: 404 }
      );
    }

    if (context?.compile_status !== "completed" || !context?.storage_path) {
      return NextResponse.json(
        {
          error: "context_not_ready",
          message: "This course does not have compiled material yet.",
        },
        { status: 400 }
      );
    }

    const { data: contextFile, error: contextDownloadError } = await admin.storage
      .from("contexts")
      .download(context.storage_path);

    if (contextDownloadError || !contextFile) {
      return NextResponse.json(
        {
          error: "context_download_failed",
          message:
            contextDownloadError?.message ?? "Could not download compiled course material.",
        },
        { status: 500 }
      );
    }

    const compiledMarkdown = await contextFile.text();

    if (!compiledMarkdown.trim()) {
      return NextResponse.json(
        {
          error: "context_empty",
          message: "The compiled course material is empty.",
        },
        { status: 400 }
      );
    }

    await admin.from("chat_messages").insert({
      session_id: resolvedSessionId,
      role: "user",
      content: message,
    });

    const assistantMessage = `Respuesta mock de Buddy IA.

Entendí tu pregunta:
"${message}"

Contexto usado:
- Curso: ${course.name}
- Perfil de personalización: sí
- Material del curso compilado: sí
${studentCourseTutor?.active_skill_md ? "- Enriquecimiento del tutor: sí" : ""}

Extracto del perfil de personalización:
${studentRecord.active_personalization_md.slice(0, 1200)}

${
  studentCourseTutor?.active_skill_md
    ? `Extracto del enriquecimiento del tutor:
${studentCourseTutor.active_skill_md.slice(0, 1200)}

`
    : ""
}Extracto del material del curso:
${compiledMarkdown.slice(0, 1200)}

Respuesta de prueba:
Según el material disponible para este curso, puedo ayudarte usando explicaciones adaptadas a tu perfil de personalización. En la versión real, aquí responderé solo con base en el material confirmado del curso y en tu perfil personalizado.`;

    await admin.from("chat_messages").insert({
      session_id: resolvedSessionId,
      role: "assistant",
      content: assistantMessage,
    });

    return NextResponse.json(
      {
        success: true,
        sessionId: resolvedSessionId,
        assistantMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CHAT_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected chat error." },
      { status: 500 }
    );
  }
}
