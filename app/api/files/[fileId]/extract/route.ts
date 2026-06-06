import { NextResponse } from "next/server";
import * as pdfParseModule from "pdf-parse";
import mammoth from "mammoth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateExtractedMarkdown } from "@/lib/files/validate-extraction";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentFileAccessContext } from "@/lib/auth/course-access";

type PdfParseFn = (buffer: Buffer) => Promise<{ text?: string }>;

function resolvePdfParse(moduleValue: unknown): PdfParseFn {
  if (typeof moduleValue === "function") {
    return moduleValue as PdfParseFn;
  }

  if (
    typeof moduleValue === "object" &&
    moduleValue !== null &&
    "default" in moduleValue &&
    typeof moduleValue.default === "function"
  ) {
    return moduleValue.default as PdfParseFn;
  }

  throw new Error("pdf-parse module could not be resolved.");
}

type RouteProps = {
  params: Promise<{
    fileId: string;
  }>;
};

function cleanToMarkdown(text: string, filename: string) {
  const cleaned = text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return `# ${filename}

${cleaned}
`;
}

export async function POST(_request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can extract files." },
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

    const { data: uploadedFile } = await supabase
      .from("uploaded_files")
      .select(
        "id, student_id, course_id, original_filename, file_type, storage_path_original"
      )
      .eq("id", fileId)
      .eq("student_id", student.id)
      .single();

    if (!uploadedFile) {
      return NextResponse.json(
        { error: "file_not_found", message: "File not found." },
        { status: 404 }
      );
    }

    const admin = createAdminClient();

    await admin
      .from("uploaded_files")
      .update({ extraction_status: "processing" })
      .eq("id", fileId);

    const { data: fileBlob, error: downloadError } = await admin.storage
      .from("uploads")
      .download(uploadedFile.storage_path_original);

    if (downloadError || !fileBlob) {
      await admin
        .from("uploaded_files")
        .update({ extraction_status: "failed" })
        .eq("id", fileId);

      return NextResponse.json(
        { error: "download_failed", message: downloadError?.message ?? "Download failed." },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";

    if (uploadedFile.file_type === "txt" || uploadedFile.file_type === "md") {
      extractedText = buffer.toString("utf-8");
    } else if (uploadedFile.file_type === "pdf") {
      const pdfParse = resolvePdfParse(pdfParseModule);
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text ?? "";
    } else if (uploadedFile.file_type === "docx") {
      const parsed = await mammoth.extractRawText({ buffer });
      extractedText = parsed.value ?? "";
    } else {
      await admin
        .from("uploaded_files")
        .update({ extraction_status: "failed" })
        .eq("id", fileId);

      return NextResponse.json(
        { error: "unsupported_file", message: "Unsupported file type." },
        { status: 400 }
      );
    }

    const markdown = cleanToMarkdown(
      extractedText,
      uploadedFile.original_filename
    );

    const validation = validateExtractedMarkdown(markdown);

    if (validation.status === "failed") {
      await admin
        .from("uploaded_files")
        .update({ extraction_status: "failed" })
        .eq("id", fileId);

      return NextResponse.json(
        { error: "extraction_failed", message: validation.reason },
        { status: 422 }
      );
    }

    const extractedPath = `${user.id}/courses/${uploadedFile.course_id}/extracted/${uploadedFile.id}.md`;

    const { error: uploadMdError } = await admin.storage
      .from("uploads")
      .upload(extractedPath, markdown, {
        contentType: "text/markdown; charset=utf-8",
        upsert: true,
      });

    if (uploadMdError) {
      await admin
        .from("uploaded_files")
        .update({ extraction_status: "failed" })
        .eq("id", fileId);

      return NextResponse.json(
        { error: "markdown_upload_failed", message: uploadMdError.message },
        { status: 500 }
      );
    }

    const { error: updateError } = await admin
      .from("uploaded_files")
      .update({
        storage_path_extracted: extractedPath,
        extraction_status: "needs_review",
      })
      .eq("id", fileId);

    if (updateError) {
      return NextResponse.json(
        { error: "file_update_failed", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "needs_review",
      reason: validation.reason,
      extractedPath,
    });
  } catch (error) {
    console.error("EXTRACT_FILE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected extraction error." },
      { status: 500 }
    );
  }
}
