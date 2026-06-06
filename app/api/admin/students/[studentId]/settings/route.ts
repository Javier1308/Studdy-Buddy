import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const schema = z.object({
  gradeId: z.string().uuid(),
  assignments: z.array(
    z.object({
      courseId: z.string().uuid(),
      tutorId: z.string().uuid(),
    })
  ),
});

type RouteProps = {
  params: Promise<{
    studentId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { studentId } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Only admins can update students." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { gradeId, assignments } = parsed.data;

    for (const assignment of assignments) {
      const { data: tutorGrade } = await admin
        .from("tutor_grades")
        .select("id")
        .eq("tutor_id", assignment.tutorId)
        .eq("grade_id", gradeId)
        .eq("is_active", true)
        .maybeSingle();

      if (!tutorGrade) {
        return NextResponse.json(
          {
            error: "tutor_cannot_teach_grade",
            message: "Uno de los tutores seleccionados no enseña el grado del estudiante.",
          },
          { status: 400 }
        );
      }
    }

    const { error: studentError } = await admin
      .from("students")
      .update({
        grade_id: gradeId,
      })
      .eq("id", studentId);

    if (studentError) {
      return NextResponse.json(
        { error: "student_update_failed", message: studentError.message },
        { status: 500 }
      );
    }

    const selectedCourseIds = assignments.map((assignment) => assignment.courseId);

    const { error: deactivateError } = await admin
      .from("student_course_tutors")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId)
      .not("course_id", "in", `(${selectedCourseIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);

    if (deactivateError) {
      return NextResponse.json(
        { error: "assignment_deactivate_failed", message: deactivateError.message },
        { status: 500 }
      );
    }

    for (const assignment of assignments) {
      const { error } = await admin.from("student_course_tutors").upsert(
        {
          student_id: studentId,
          course_id: assignment.courseId,
          tutor_id: assignment.tutorId,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "student_id,course_id",
        }
      );

      if (error) {
        return NextResponse.json(
          { error: "assignment_update_failed", message: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UPDATE_STUDENT_SETTINGS_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected student settings error." },
      { status: 500 }
    );
  }
}
