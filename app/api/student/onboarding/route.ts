import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { generatePersonalizationMd } from "@/lib/ai/generate-personalization-md";
import { OnboardingAnswers } from "@/lib/onboarding/questions";

const schema = z.object({
  answers: z.object({
    q1: z.enum(["A", "B", "C", "D"]),
    q2: z.enum(["A", "B", "C", "D"]),
    q3: z.enum(["A", "B", "C", "D"]),
    q4: z.enum(["A", "B", "C", "D"]),
    q5: z.enum(["A", "B", "C", "D"]),
    q6: z.enum(["A", "B", "C", "D"]),
    q7: z.enum(["A", "B", "C", "D"]),
    q8: z.enum(["A", "B", "C", "D"]),
  }),
});

export async function POST(request: Request) {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user: approvedUser } = approvedUserResult;

    if (approvedUser.role !== "student") {
      return NextResponse.json(
        { error: "forbidden", message: "Only students can complete onboarding." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const answers = parsed.data.answers as OnboardingAnswers;

    // Derive studentId from the authenticated user's profile
    const { data: student, error: studentError } = await admin
      .from("students")
      .select("id")
      .eq("profile_id", approvedUser.id)
      .maybeSingle();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "student_not_found", message: "Student profile not found." },
        { status: 404 }
      );
    }

    // Generate personalization markdown
    const personalizationMd = generatePersonalizationMd(answers);

    // Update students table with onboarding data
    const { error: updateError } = await admin
      .from("students")
      .update({
        onboarding_answers: answers,
        active_personalization_md: personalizationMd,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq("id", student.id);

    if (updateError) {
      return NextResponse.json(
        { error: "onboarding_save_failed", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ONBOARDING_ERROR", error);
    return NextResponse.json(
      { error: "internal_error", message: "Unexpected onboarding error." },
      { status: 500 }
    );
  }
}
