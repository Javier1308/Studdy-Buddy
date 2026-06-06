import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { canAccessStudentCourse } from "@/lib/auth/course-access";

const schema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()).optional().default({}),
  notes: z.string().optional().default(""),
});

export async function POST(request: Request) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

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

    const { data: tutor } = await supabase
      .from("tutors")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!tutor) {
      return NextResponse.json(
        { error: "forbidden", message: "Only tutors can create surveys." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { studentId, courseId, answers, notes } = parsed.data;

    const hasStudentCourseAccess = await canAccessStudentCourse({
      user: approvedUser,
      studentId,
      courseId,
    });

    if (!hasStudentCourseAccess) {
      return NextResponse.json(
        { error: "student_course_not_found", message: "Student course not found." },
        { status: 404 }
      );
    }


    const { data: accessAssignment } = await admin
      .from("student_course_tutors")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("tutor_id", tutor.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!accessAssignment) {
      return NextResponse.json(
        {
          error: "student_course_not_assigned",
          message: "This student/course is not assigned to you.",
        },
        { status: 403 }
      );
    }

    const { count } = await admin
      .from("tutor_feedback_surveys")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("course_id", courseId);

    if ((count ?? 0) >= 3) {
      return NextResponse.json(
        {
          error: "survey_limit_reached",
          message:
            "Este alumno ya tiene 3 encuestas para este curso. Elimina una encuesta anterior para crear una nueva.",
        },
        { status: 400 }
      );
    }

    const { data: survey, error } = await admin
      .from("tutor_feedback_surveys")
      .insert({
        student_id: studentId,
        course_id: courseId,
        tutor_id: tutor.id,
        answers,
        notes,
        generation_status: "pending",
        is_promoted: false,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "survey_create_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      surveyId: survey.id,
    });
  } catch (error) {
    console.error("CREATE_SURVEY_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected survey creation error." },
      { status: 500 }
    );
  }
}
