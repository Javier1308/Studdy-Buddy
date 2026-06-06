import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ApiApprovedUser = {
  id: string;
  email: string;
  role: "student" | "tutor" | "admin";
};

export async function requireApprovedApiUser():
  Promise<{ user: ApiApprovedUser; error: null } | { user: null; error: NextResponse }> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "unauthorized", message: "Not authenticated." },
        { status: 401 }
      ),
    };
  }

  if (!user.email_confirmed_at) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "email_not_verified", message: "Verify your email before continuing." },
        { status: 403 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, approval_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "profile_not_found", message: "Profile not found." },
        { status: 404 }
      ),
    };
  }

  if (profile.approval_status !== "approved") {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: "account_not_approved",
          message: "Your account is not approved yet.",
          approvalStatus: profile.approval_status,
        },
        { status: 403 }
      ),
    };
  }

  return {
    user: {
      id: profile.id,
      email: profile.email,
      role: profile.role,
    },
    error: null,
  };
}
