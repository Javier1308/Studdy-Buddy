import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentFileAccessContext } from "@/lib/auth/course-access";

type RouteProps = {
  params: Promise<{
    fileId: string;
  }>;
};

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

async function compileCourseContext({
  admin,
  userId,
  studentId,
  courseId,
}: {
  admin: ReturnType<typeof createAdminClient>;
  userId: string;
  studentId: string;
  courseId: string;
}) {
  const { data: files, error: filesError } = await admin
    .from("uploaded_files")
    .select("id, original_filename, storage_path_extracted")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .eq("extraction_status", "completed")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (filesError) {
    throw new Error(filesError.message);
  }

  const sections: string[] = [];

  for (const file of files ?? []) {
    if (!file.storage_path_extracted) continue;

    const { data: blob, error } = await admin.storage
      .from("uploads")
      .download(file.storage_path_extracted);

    if (error || !blob) continue;

    const markdown = await blob.text();

    sections.push(
      `\n\n---\n\n# Material: ${file.original_filename}\n\n${markdown.trim()}`
    );
  }

  const compiledMarkdown = `# Compiled Course Context\n\n${sections.join("\n")}`.trim();
  const contextPath = `${userId}/${courseId}/compiled.md`;

  const { error: uploadError } = await admin.storage
    .from("contexts")
    .upload(contextPath, compiledMarkdown, {
      contentType: "text/markdown; charset=utf-8",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const tokenCount = estimateTokens(compiledMarkdown);

  const { error: upsertError } = await admin.from("course_contexts").upsert(
    {
      student_id: studentId,
      course_id: courseId,
      storage_path: contextPath,
      token_count: tokenCount,
      compile_status: "completed",
      last_compiled_at: new Date().toISOString(),
    },
    {
      onConflict: "student_id,course_id",
    }
  );

  if (upsertError) {
    throw new Error(upsertError.message);
  }

  return { contextPath, tokenCount };
}

export async function POST(request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can confirm files." },
        { status: 403 }
      );
    }

    const { fileId } = await params;
    const fileAccess = await getStudentFileAccessContext({
      user: approvedUser,
      fileId,
    });

    if (!fileAccess) {
      return NextResponse.json(
        { error: "file_not_found", message: "File not found." },
        { status: 404 }
      );
    }


    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!student) {
      return NextResponse.json(
        { error: "student_not_found", message: "Student profile not found." },
        { status: 403 }
      );
    }

    const { data: file } = await supabase
      .from("uploaded_files")
      .select("id, student_id, course_id, storage_path_extracted, extraction_status")
      .eq("id", fileId)
      .eq("student_id", student.id)
      .single();

    if (!file) {
      return NextResponse.json(
        { error: "file_not_found", message: "File not found." },
        { status: 404 }
      );
    }

    if (file.extraction_status !== "needs_review") {
      return NextResponse.json(
        {
          error: "invalid_status",
          message: "Only files marked as needs_review can be confirmed.",
        },
        { status: 400 }
      );
    }

    if (!file.storage_path_extracted) {
      return NextResponse.json(
        {
          error: "missing_extracted_file",
          message: "Extracted markdown file is missing.",
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    let editedMarkdown = "";

    try {
      const body = await request.json();
      editedMarkdown = String(body?.editedMarkdown ?? "").trim();
    } catch {
      editedMarkdown = "";
    }

    if (editedMarkdown && editedMarkdown.length < 20) {
      return NextResponse.json(
        {
          error: "edited_markdown_too_short",
          message: "El contenido editado es demasiado corto.",
        },
        { status: 400 }
      );
    }

    if (editedMarkdown) {
      const { error: overwriteError } = await admin.storage
        .from("uploads")
        .upload(file.storage_path_extracted, editedMarkdown, {
          contentType: "text/markdown; charset=utf-8",
          upsert: true,
        });

      if (overwriteError) {
        return NextResponse.json(
          { error: "markdown_update_failed", message: overwriteError.message },
          { status: 500 }
        );
      }
    }

    const { error: updateError } = await admin
      .from("uploaded_files")
      .update({
        extraction_status: "completed",
      })
      .eq("id", fileId);

    if (updateError) {
      return NextResponse.json(
        { error: "file_confirm_failed", message: updateError.message },
        { status: 500 }
      );
    }

    const compiled = await compileCourseContext({
      admin,
      userId: user.id,
      studentId: student.id,
      courseId: file.course_id,
    });

    return NextResponse.json({
      success: true,
      message: "Material confirmed and course context compiled.",
      contextPath: compiled.contextPath,
      tokenCount: compiled.tokenCount,
    });
  } catch (error) {
    console.error("CONFIRM_FILE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected confirm error." },
      { status: 500 }
    );
  }
}
