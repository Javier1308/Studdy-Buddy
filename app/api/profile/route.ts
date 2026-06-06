import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const schema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(120),
  institutionName: z.string().max(160).optional().default(""),
});

export async function POST(request: Request) {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
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
    const { user } = approvedUserResult;
    const { firstName, lastName, institutionName } = parsed.data;

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      })
      .eq("id", user.id);

    if (profileError) {
      return NextResponse.json(
        { error: "profile_update_failed", message: profileError.message },
        { status: 500 }
      );
    }

    if (user.role === "student") {
      const { error: studentError } = await admin
        .from("students")
        .update({
          institution_name: institutionName.trim() || null,
        })
        .eq("profile_id", user.id);

      if (studentError) {
        return NextResponse.json(
          { error: "student_update_failed", message: studentError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PROFILE_UPDATE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected profile update error." },
      { status: 500 }
    );
  }
}
