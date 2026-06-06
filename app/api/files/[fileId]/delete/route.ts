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

export async function POST(_request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can delete files." },
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

    const admin = createAdminClient();

    const { error } = await admin
      .from("uploaded_files")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", fileId)
      .eq("student_id", student.id);

    if (error) {
      return NextResponse.json(
        { error: "delete_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_FILE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected delete error." },
      { status: 500 }
    );
  }
}
