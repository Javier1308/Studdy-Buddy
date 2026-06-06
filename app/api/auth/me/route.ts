import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "profile_not_found", message: "Profile not found." },
        { status: 404 }
      );
    }

    let typedId: string | null = null;

    if (profile.role === "student") {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      typedId = data?.id ?? null;
    }

    if (profile.role === "tutor") {
      const { data } = await supabase
        .from("tutors")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      typedId = data?.id ?? null;
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      typedId,
    });
  } catch (error) {
    console.error("ME_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected auth/me error." },
      { status: 500 }
    );
  }
}
