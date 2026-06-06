import { NextResponse } from "next/server";
import { z } from "zod";
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

    if (approvedUser.role !== "tutor") {
      return NextResponse.json(
        { error: "forbidden", message: "Only tutors can promote skill.md." },
        { status: 403 }
      );
    }

    const { surveyId } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { studentId, courseId } = parsed.data;
    const admin = createAdminClient();

    const hasStudentCourseAccess = await canAccessStudentCourse({
      user: approvedUser,
      studentId,
      courseId,
    });

    if (!hasStudentCourseAccess) {
      return NextResponse.json(
        { error: "survey_not_found", message: "Survey not found." },
        { status: 404 }
      );
    }

    const { data: tutor } = await admin
      .from("tutors")
      .select("id")
      .eq("profile_id", approvedUser.id)
      .maybeSingle();

    if (!tutor) {
      return NextResponse.json(
        { error: "forbidden", message: "Tutor profile not found." },
        { status: 403 }
      );
    }

    const { data: survey } = await admin
      .from("tutor_feedback_surveys")
      .select("id, student_id, course_id, tutor_id, generated_skill_md")
      .eq("id", surveyId)
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("tutor_id", tutor.id)
      .maybeSingle();

    if (!survey) {
      return NextResponse.json(
        { error: "survey_not_found", message: "Survey not found." },
        { status: 404 }
      );
    }

    if (!survey.generated_skill_md) {
      return NextResponse.json(
        {
          error: "survey_not_ready",
          message: "This survey has no generated skill.md.",
        },
        { status: 400 }
      );
    }

    const { data: assignment } = await admin
      .from("student_course_tutors")
      .select("id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("tutor_id", tutor.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json(
        { error: "survey_not_found", message: "Survey not found." },
        { status: 404 }
      );
    }

    await admin
      .from("tutor_feedback_surveys")
      .update({ is_promoted: false })
      .eq("student_id", studentId)
      .eq("course_id", courseId);

    const { error: surveyUpdateError } = await admin
      .from("tutor_feedback_surveys")
      .update({
        is_promoted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", surveyId);

    if (surveyUpdateError) {
      return NextResponse.json(
        { error: "survey_update_failed", message: surveyUpdateError.message },
        { status: 500 }
      );
    }

    const { error: assignmentUpdateError } = await admin
      .from("student_course_tutors")
      .update({
        active_skill_md: survey.generated_skill_md,
        active_skill_survey_id: survey.id,
        active_skill_md_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);

    if (assignmentUpdateError) {
      return NextResponse.json(
        { error: "skill_promote_failed", message: assignmentUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PROMOTE_SKILL_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected promote skill error." },
      { status: 500 }
    );
  }
}
