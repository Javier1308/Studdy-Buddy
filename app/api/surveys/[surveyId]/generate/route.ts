import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMockSkillMd } from "@/lib/ai";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { canAccessStudentCourse } from "@/lib/auth/course-access";

type RouteProps = {
  params: Promise<{
    surveyId: string;
  }>;
};

type SurveyAnswers = {
  learningDifficulties?: string;
  preferredStyle?: string;
  interests?: string;
  avoid?: string;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    const { surveyId } = await params;

    let regenerationReason = "";

    try {
      const body = await request.json();
      regenerationReason = String(body?.regenerationReason ?? "").trim();
    } catch {
      regenerationReason = "";
    }

    if (regenerationReason.length > 800) {
      return NextResponse.json(
        {
          error: "reason_too_long",
          message: "El motivo de regeneración no debe superar 800 caracteres.",
        },
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
        { error: "forbidden", message: "Only tutors can generate skill.md." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: survey, error: surveyError } = await admin
      .from("tutor_feedback_surveys")
      .select("id, tutor_id, student_id, course_id, answers, notes")
      .eq("id", surveyId)
      .single();

    if (surveyError || !survey) {
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

    const { data: accessAssignment } = await admin
      .from("student_course_tutors")
      .select("id")
      .eq("student_id", survey.student_id)
      .eq("tutor_id", tutor.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!accessAssignment) {
      return NextResponse.json(
        {
          error: "student_not_assigned",
          message: "This student is not assigned to you.",
        },
        { status: 403 }
      );
    }

    const answers = (survey.answers ?? {}) as SurveyAnswers;

    const skillInput = {
      learningDifficulties: answers.learningDifficulties ?? "",
      preferredStyle: answers.preferredStyle ?? "step_by_step",
      interests: answers.interests ?? "",
      avoid: answers.avoid ?? "",
      notes: survey.notes ?? "",

      // Compatibilidad por si generateMockSkillMd esperaba nombres antiguos.
      mainDifficulty: answers.learningDifficulties ?? "",
      explanationStyle: answers.preferredStyle ?? "step_by_step",
      personalizationAnchors: answers.interests ?? "",
      whatToAvoid: answers.avoid ?? "",
      additionalTutorNotes: survey.notes ?? "",
    };

    const hasStudentCourseAccess = await canAccessStudentCourse({
      user: approvedUser,
      studentId: survey.student_id,
      courseId: survey.course_id,
    });

    if (!hasStudentCourseAccess) {
      return NextResponse.json(
        { error: "survey_not_found", message: "Survey not found." },
        { status: 404 }
      );
    }


    const skillMd = generateMockSkillMd(skillInput, regenerationReason);

    const { error: updateError } = await admin
      .from("tutor_feedback_surveys")
      .update({
        generated_skill_md: skillMd,
        generation_status: "completed",
        is_promoted: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", surveyId);

    if (updateError) {
      return NextResponse.json(
        { error: "skill_generation_failed", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      generatedSkillMd: skillMd,
    });
  } catch (error) {
    console.error("GENERATE_SKILL_MD_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected skill.md generation error." },
      { status: 500 }
    );
  }
}
