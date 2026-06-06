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

export async function GET(_request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can preview files." },
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
      .select("id, student_id, original_filename, storage_path_extracted, extraction_status")
      .eq("id", fileId)
      .eq("student_id", student.id)
      .single();

    if (!file || !file.storage_path_extracted) {
      return NextResponse.json(
        { error: "file_not_ready", message: "Extracted file not found." },
        { status: 404 }
      );
    }

    const admin = createAdminClient();

    const { data: blob, error } = await admin.storage
      .from("uploads")
      .download(file.storage_path_extracted);

    if (error || !blob) {
      return NextResponse.json(
        { error: "download_failed", message: error?.message ?? "Download failed." },
        { status: 500 }
      );
    }

    const markdown = await blob.text();

    return NextResponse.json({
      fileId: file.id,
      filename: file.original_filename,
      status: file.extraction_status,
      markdown,
      preview: markdown.slice(0, 4000),
    });
  } catch (error) {
    console.error("PREVIEW_FILE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected preview error." },
      { status: 500 }
    );
  }
}
