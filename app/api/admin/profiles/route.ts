import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

export async function GET() {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
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

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (requesterProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Only admins can list profiles." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data, error } = await admin
      .from("profiles")
      .select("id, email, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "profiles_fetch_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ profiles: data });
  } catch (error) {
    console.error("ADMIN_PROFILES_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected admin profiles error." },
      { status: 500 }
    );
  }
}
