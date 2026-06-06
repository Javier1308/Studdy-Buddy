import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteProps = {
  params: Promise<{
    tutorGradeId: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  try {
    const { tutorGradeId } = await params;

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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Only admins can deactivate tutor grades." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("tutor_grades")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tutorGradeId);

    if (error) {
      return NextResponse.json(
        { error: "deactivate_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DEACTIVATE_TUTOR_GRADE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected tutor grade deactivate error." },
      { status: 500 }
    );
  }
}
