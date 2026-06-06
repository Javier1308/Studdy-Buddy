import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

type RouteProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user } = approvedUserResult;

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Solo administradores pueden restaurar cursos." },
        { status: 403 }
      );
    }

    const { courseId } = await params;
    const admin = createAdminClient();

    const { data: course, error: courseError } = await admin
      .from("courses")
      .select("id, name, deleted_at")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course) {
      return NextResponse.json(
        { error: "course_not_found", message: "Curso no encontrado." },
        { status: 404 }
      );
    }

    if (!course.deleted_at) {
      return NextResponse.json({ success: true, alreadyRestored: true });
    }

    const { error: courseUpdateError } = await admin
      .from("courses")
      .update({ deleted_at: null })
      .eq("id", courseId);

    if (courseUpdateError) {
      return NextResponse.json(
        { error: "course_restore_failed", message: courseUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ADMIN_RESTORE_COURSE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected course restore error." },
      { status: 500 }
    );
  }
}
