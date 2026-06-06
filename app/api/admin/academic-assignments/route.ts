import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const assignmentSchema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  tutorId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const body = await request.json();
    const parsed = assignmentSchema.safeParse(body);

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
        { error: "forbidden", message: "Only admins can create academic assignments." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { studentId, courseId, tutorId } = parsed.data;

    const { data: student } = await admin
      .from("students")
      .select("id, grade_id")
      .eq("id", studentId)
      .single();

    if (!student?.grade_id) {
      return NextResponse.json(
        {
          error: "student_missing_grade",
          message: "Assign a grade to this student before creating an academic assignment.",
        },
        { status: 400 }
      );
    }

    const { data: tutorGrade } = await admin
      .from("tutor_grades")
      .select("id")
      .eq("tutor_id", tutorId)
      .eq("grade_id", student.grade_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!tutorGrade) {
      return NextResponse.json(
        {
          error: "tutor_cannot_teach_grade",
          message: "This tutor is not assigned to teach the student's grade.",
        },
        { status: 400 }
      );
    }

    const { error } = await admin.from("student_course_tutors").upsert(
      {
        student_id: studentId,
        course_id: courseId,
        tutor_id: tutorId,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "student_id,course_id",
      }
    );

    if (error) {
      return NextResponse.json(
        { error: "assignment_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Academic assignment saved.",
    });
  } catch (error) {
    console.error("ACADEMIC_ASSIGNMENT_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected assignment error." },
      { status: 500 }
    );
  }
}
