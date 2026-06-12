import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";
import { getStudentSessionAccessContext } from "@/lib/auth/session-access";
import { generateChatResponse } from "@/lib/chat/provider";
import { retrieveRelevantCourseSections } from "@/lib/chat/retrieve-context-sections";

const OUT_OF_SCOPE_REFUSAL =
  "No encontré información sobre eso en el material de este curso. Te recomiendo revisar tus apuntes o consultar con tu tutor.";

const SOCIAL_REDIRECT =
  "¡Hola! Soy Buddy IA. ¿Qué tema del curso quieres repasar hoy?";

const SOCIAL_ACKNOWLEDGMENT =
  "¡Con gusto! Cuando quieras, seguimos repasando el material del curso.";

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

    // Helper: generate session title from message text (hoisted for reuse)
    const generateTitle = (text: string): string => {
      const trimmed = text.trim();
      if (trimmed.length <= 60) return trimmed;
      const truncated = trimmed.slice(0, 60);
      const lastSpace = truncated.lastIndexOf(" ");
      return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    };

    // Tier 0: Reject messages that contain no meaningful content beyond whitespace/punctuation.
    // Note: Zod min(1) already catches empty strings. This catches whitespace-only or symbol-only.
    const trimmedMessage = message.trim();
    if (!trimmedMessage || /^[\s\W]+$/.test(trimmedMessage)) {
      return NextResponse.json(
        { error: "invalid_payload", message: "Message contains no meaningful content." },
        { status: 400 }
      );
    }

    // Social intent classifier: detect greetings, thanks, and meta questions.
    // Returns a fixed reply string if social intent is detected, undefined otherwise.
    function classifySocialIntent(text: string): string | undefined {
      const t = text.trim().toLowerCase();

      // Greetings
      if (/^(hola|hi|hello|hey|buenas|buenos\s+días|buenas\s+tardes|buenas\s+noches|buen\s+día)[!?.¡¿,]*$/.test(t)) {
        return SOCIAL_REDIRECT;
      }

      // Thanks
      if (/^(gracias|thanks|thank\s+you|muchas\s+gracias|ok\s+gracias|ok)[!?.¡¿,]*$/.test(t)) {
        return SOCIAL_ACKNOWLEDGMENT;
      }

      // Meta questions about the assistant
      if (/^(quién\s+eres|quien\s+eres|qué\s+eres|que\s+eres|qué\s+puedes\s+hacer|que\s+puedes\s+hacer|cómo\s+funciona|como\s+funciona)[?!.¡¿]*$/.test(t)) {
        return SOCIAL_REDIRECT;
      }

      return undefined;
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
      // Social first messages get a generic title; academic first messages get
      // a content-derived title.
      const title = classifySocialIntent(message) !== undefined
        ? "Nuevo chat"
        : generateTitle(message);

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

    // Fetch bounded conversation history from the current validated session.
    // This is done after resolvedSessionId is confirmed and before inserting the
    // current user message, so the current turn is not included in history.
    const { data: historyRows, error: historyError } = await admin
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", resolvedSessionId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (historyError) {
      console.error("CHAT_HISTORY_ERROR", historyError.message);
    }

    const conversationHistory = (historyRows ?? [])
      .reverse()
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          m.role === "user" || m.role === "assistant"
      );

    // Social branch: if the message is a greeting, thanks, or meta question,
    // return a fixed redirect reply without fetching course data, downloading context,
    // running retrieval, or calling the AI provider.
    // All required guards have passed at this point:
    //   - requireApprovedApiUser() ✓
    //   - role === "student" ✓
    //   - getStudentCourseAccessContext() ✓
    //   - personalization gate ✓
    //   - resolvedSessionId confirmed ✓
    const socialReply = classifySocialIntent(message);
    if (socialReply !== undefined) {
      const { error: socialUserMsgError } = await admin.from("chat_messages").insert({
        session_id: resolvedSessionId,
        role: "user",
        content: message,
      });
      if (socialUserMsgError) {
        console.error("CHAT_MESSAGE_INSERT_ERROR", socialUserMsgError.message);
        return NextResponse.json(
          { error: "internal_error", message: "Could not persist message." },
          { status: 500 }
        );
      }

      const { error: socialAssistantMsgError } = await admin.from("chat_messages").insert({
        session_id: resolvedSessionId,
        role: "assistant",
        content: socialReply,
      });
      if (socialAssistantMsgError) {
        console.error("CHAT_MESSAGE_INSERT_ERROR", socialAssistantMsgError.message);
        return NextResponse.json(
          { error: "internal_error", message: "Could not persist response." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, sessionId: resolvedSessionId, assistantMessage: socialReply },
        { status: 201 }
      );
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

    // If this is an existing session whose title is still the default "Nuevo chat",
    // and the current message is academic (social branch already exited above),
    // update the title to a content-derived value.
    // Uses .eq("title", "Nuevo chat") predicate so manual renames are never overwritten.
    // Non-fatal: log and continue on error.
    if (sessionId) {
      const derivedTitle = generateTitle(message);
      const { error: titleUpdateError } = await admin
        .from("chat_sessions")
        .update({ title: derivedTitle })
        .eq("id", resolvedSessionId)
        .eq("title", "Nuevo chat");

      if (titleUpdateError) {
        console.error("CHAT_SESSION_TITLE_UPDATE_ERROR", titleUpdateError.message);
        // Non-fatal: continue with existing title
      }
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
          message: "Could not download compiled course material.",
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

    // Retrieve only the sections relevant to the current question + recent
    // history. This replaces full-blob injection with topic-scoped context.
    const { found: sectionsFound, contextString: courseContextMarkdown } =
      retrieveRelevantCourseSections({
        compiledMarkdown,
        studentMessage: message,
        conversationHistory,
      });

    // Persist user message before any AI call (same as before — message must
    // never be lost even when the provider or the retrieval returns nothing).
    const { error: userMessageError } = await admin.from("chat_messages").insert({
      session_id: resolvedSessionId,
      role: "user",
      content: message,
    });

    if (userMessageError) {
      console.error("CHAT_MESSAGE_INSERT_ERROR", userMessageError.message);
      return NextResponse.json(
        { error: "internal_error", message: "Could not persist message." },
        { status: 500 }
      );
    }

    let assistantMessage: string;

    if (!sectionsFound) {
      // Hard backend refusal — no AI provider call.
      // Insert the refusal as an assistant turn so the student sees it in the
      // session and history remains consistent.
      assistantMessage = OUT_OF_SCOPE_REFUSAL;

      const { error: refusalInsertError } = await admin.from("chat_messages").insert({
        session_id: resolvedSessionId,
        role: "assistant",
        content: assistantMessage,
      });

      if (refusalInsertError) {
        console.error("CHAT_MESSAGE_INSERT_ERROR", refusalInsertError.message);
        return NextResponse.json(
          { error: "internal_error", message: "Could not persist response." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          sessionId: resolvedSessionId,
          assistantMessage,
        },
        { status: 201 }
      );
    }

    // User message is persisted before provider call intentionally.
    // If AI generation fails, the student's message remains in history
    // but no assistant message is inserted, preserving history integrity.
    try {
      assistantMessage = await generateChatResponse({
        studentMessage: message,
        personalizationMarkdown: studentRecord.active_personalization_md,
        tutorEnrichmentMarkdown: studentCourseTutor?.active_skill_md ?? null,
        courseContextMarkdown,
        conversationHistory,
      });
    } catch (providerError) {
      console.error("AI_PROVIDER_ERROR", (providerError as Error).message);
      return NextResponse.json(
        {
          error: "ai_provider_error",
          message:
            "The AI provider failed to generate a response. Please try again.",
        },
        { status: 502 }
      );
    }

    const { error: assistantInsertError } = await admin.from("chat_messages").insert({
      session_id: resolvedSessionId,
      role: "assistant",
      content: assistantMessage,
    });

    if (assistantInsertError) {
      console.error("CHAT_MESSAGE_INSERT_ERROR", assistantInsertError.message);
      return NextResponse.json(
        { error: "internal_error", message: "Could not persist response." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        sessionId: resolvedSessionId,
        assistantMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CHAT_ERROR", (error as Error).message);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected chat error." },
      { status: 500 }
    );
  }
}
