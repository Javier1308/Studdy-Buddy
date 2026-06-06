import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt", "md"];

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
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
        { error: "forbidden", message: "Only students can upload files." },
        { status: 403 }
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

    const formData = await request.formData();
    const file = formData.get("file");
    const rawCourseId = formData.get("courseId");

    if (typeof rawCourseId !== "string" || !rawCourseId) {
      return NextResponse.json(
        { error: "invalid_course_id", message: "Course ID is required." },
        { status: 400 }
      );
    }

    const courseId = rawCourseId;

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


    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "missing_file", message: "No file provided." },
        { status: 400 }
      );
    }

    if (typeof courseId !== "string") {
      return NextResponse.json(
        { error: "missing_course", message: "No course selected." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "file_too_large", message: "El archivo no debe superar 5 MB." },
        { status: 413 }
      );
    }

    const extension = getExtension(file.name);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        {
          error: "invalid_file_type",
          message: "Solo se permiten archivos PDF, DOCX, TXT o Markdown.",
        },
        { status: 400 }
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

    const admin = createAdminClient();

    const fileId = crypto.randomUUID();
    const storagePath = `${user.id}/courses/${courseId}/originals/${fileId}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await admin.storage
      .from("uploads")
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "storage_upload_failed", message: uploadError.message },
        { status: 500 }
      );
    }

    const { data: uploadedFile, error: dbError } = await admin
      .from("uploaded_files")
      .insert({
        id: fileId,
        student_id: studentCourseAccess.studentId,
        course_id: courseId,
        original_filename: file.name,
        file_type: extension,
        file_size_bytes: file.size,
        storage_path_original: storagePath,
        extraction_status: "pending",
      })
      .select("id")
      .single();

    if (dbError) {
      return NextResponse.json(
        { error: "file_record_failed", message: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadedFileId: uploadedFile.id,
    });
  } catch (error) {
    console.error("UPLOAD_FILE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected upload error." },
      { status: 500 }
    );
  }
}
