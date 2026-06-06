import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { canAccessStudentCourse } from "@/lib/auth/course-access";

const schema = z.object({
  studentId: z.string().uuid(),
  courseId: z.string().uuid(),
});

type RouteProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    const { surveyId } = await params;
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
        { error: "forbidden", message: "Only tutors can delete surveys." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { studentId, courseId } = parsed.data;

    const { data: assignment } = await admin
      .from("student_course_tutors")
      .select("id, active_skill_survey_id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("tutor_id", tutor.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        {
          error: "assignment_not_found",
          message: "This student/course is not assigned to you.",
        },
        { status: 403 }
      );
    }

    const { data: survey } = await admin
      .from("tutor_feedback_surveys")
      .select("id, student_id, course_id, tutor_id, is_promoted")
      .eq("id", surveyId)
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (!survey) {
      return NextResponse.json(
        { error: "survey_not_found", message: "Survey not found." },
        { status: 404 }
      );
    }

    if (survey.tutor_id !== tutor.id) {
      return NextResponse.json(
        { error: "forbidden", message: "This survey does not belong to you." },
        { status: 403 }
      );
    }

    const isActiveSurvey =
      survey.is_promoted || assignment.active_skill_survey_id === survey.id;

    if (isActiveSurvey) {
      return NextResponse.json(
        {
          error: "cannot_delete_active_survey",
          message:
            "No puedes eliminar la encuesta activa. Primero activa otra skill.md para este curso.",
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await admin
      .from("tutor_feedback_surveys")
      .delete()
      .eq("id", surveyId);

    if (deleteError) {
      return NextResponse.json(
        { error: "survey_delete_failed", message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_SURVEY_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected survey delete error." },
      { status: 500 }
    );
  }
}
