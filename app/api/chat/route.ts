import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";

const schema = z.object({
  courseId: z.string().uuid(),
  message: z.string().min(1).max(4000),
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
    const { courseId, message } = parsed.data;

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

    if (!studentCourseTutor.active_skill_md) {
      return NextResponse.json(
        {
          error: "skill_not_active",
          message: "This course does not have an active skill.md yet.",
        },
        { status: 403 }
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

    let sessionId: string;

    const { data: existingSession } = await admin
      .from("chat_sessions")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingSession) {
      sessionId = existingSession.id;
    } else {
      const { data: newSession, error: sessionError } = await admin
        .from("chat_sessions")
        .insert({
          student_id: student.id,
          course_id: courseId,
        })
        .select("id")
        .single();

      if (sessionError || !newSession) {
        return NextResponse.json(
          {
            error: "session_create_failed",
            message: sessionError?.message ?? "Could not create chat session.",
          },
          { status: 500 }
        );
      }

      sessionId = newSession.id;
    }

    await admin.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content: message,
    });

    const assistantMessage = `Respuesta mock de Buddy IA.

Entendí tu pregunta:
"${message}"

Contexto usado:
- Curso: ${course.name}
- Skill personalizada del curso: sí
- Material del curso compilado: sí

Extracto del perfil personalizado del curso:
${studentCourseTutor.active_skill_md.slice(0, 1200)}

Extracto del material del curso:
${compiledMarkdown.slice(0, 1200)}

Respuesta de prueba:
Según el material disponible para este curso, puedo ayudarte usando explicaciones adaptadas a tu perfil activo. En la versión real, aquí responderé solo con base en el material confirmado del curso y en tu skill.md activa para este curso.`;

    await admin.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: assistantMessage,
    });

    return NextResponse.json({
      success: true,
      assistantMessage,
    });
  } catch (error) {
    console.error("CHAT_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected chat error." },
      { status: 500 }
    );
  }
}
