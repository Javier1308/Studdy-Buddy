import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";
import { generatePersonalizationMd } from "@/lib/ai/generate-personalization-md";
import { OnboardingAnswers } from "@/lib/onboarding/questions";

// Rejects emails, URLs, @handles, phone-like digit strings, and private contact info
const CONTACT_INFO_RE = /(@|https?:\/\/|www\.|[\d]{7,}|\+\d)/i;

const schema = z.object({
  answers: z.object({
    q1: z.enum(["A", "B", "C", "D"]),
    q2: z.enum(["A", "B", "C", "D"]),
    q3: z.enum(["A", "B", "C", "D"]),
    q4: z.enum(["A", "B", "C", "D"]),
    q5: z.enum(["A", "B", "C", "D"]),
    q6: z.enum(["A", "B", "C", "D", "E"]),
    q6_custom_text: z.string().min(2).max(120).optional(),
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

    const rawCustom = parsed.data.answers.q6_custom_text?.trim() ?? "";

    if (parsed.data.answers.q6 === "E") {
      if (rawCustom.length < 2) {
        return NextResponse.json(
          { error: "invalid_payload", message: "q6_custom_text is required when q6 is E (min 2 characters)." },
          { status: 400 }
        );
      }
      if (CONTACT_INFO_RE.test(rawCustom)) {
        return NextResponse.json(
          { error: "invalid_payload", message: "q6_custom_text must not contain contact info, URLs, or handles." },
          { status: 400 }
        );
      }
    }

    // Build the answers object to store; include q6_custom_text only when q6 === "E"
    const answersToStore: OnboardingAnswers = {
      q1: parsed.data.answers.q1,
      q2: parsed.data.answers.q2,
      q3: parsed.data.answers.q3,
      q4: parsed.data.answers.q4,
      q5: parsed.data.answers.q5,
      q6: parsed.data.answers.q6,
      ...(parsed.data.answers.q6 === "E" ? { q6_custom_text: rawCustom } : {}),
      q7: parsed.data.answers.q7,
      q8: parsed.data.answers.q8,
    };

    const admin = createAdminClient();

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
    const personalizationMd = generatePersonalizationMd(answersToStore);

    // Update students table with onboarding data
    const { error: updateError } = await admin
      .from("students")
      .update({
        onboarding_answers: answersToStore,
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
