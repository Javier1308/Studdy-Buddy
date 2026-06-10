import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentSessionAccessContext } from "@/lib/auth/session-access";

const renameSchema = z.object({
  title: z.string().trim().min(1).max(80),
});

const deleteSchema = z.object({
  action: z.literal("delete"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can manage chat sessions." },
        { status: 403 }
      );
    }

    const { sessionId } = await params;

    // Validate session ownership
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

    const body = await request.json();

    // Check if this is a delete or rename request
    const deleteAttempt = deleteSchema.safeParse(body);
    if (deleteAttempt.success) {
      // Handle delete
      const admin = createAdminClient();

      const { error: updateError } = await admin
        .from("chat_sessions")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", sessionId);

      if (updateError) {
        return NextResponse.json(
          {
            error: "delete_failed",
            message: updateError.message ?? "Could not delete session.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, deleted: true });
    }

    // Try rename
    const renameAttempt = renameSchema.safeParse(body);
    if (!renameAttempt.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: renameAttempt.error.flatten() },
        { status: 400 }
      );
    }

    const { title } = renameAttempt.data;
    const admin = createAdminClient();

    const { error: updateError } = await admin
      .from("chat_sessions")
      .update({ title })
      .eq("id", sessionId);

    if (updateError) {
      return NextResponse.json(
        {
          error: "rename_failed",
          message: updateError.message ?? "Could not rename session.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, title });
  } catch (error) {
    console.error("CHAT_SESSION_ACTION_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected error." },
      { status: 500 }
    );
  }
}
