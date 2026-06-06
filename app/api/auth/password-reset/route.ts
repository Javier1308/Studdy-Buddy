import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

export async function POST() {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user } = approvedUserResult;
    const supabase = await createServerSupabaseClient();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${siteUrl}/update-password`,
    });

    if (error) {
      return NextResponse.json(
        { error: "password_reset_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PASSWORD_RESET_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected password reset error." },
      { status: 500 }
    );
  }
}
