import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const schema = z.object({
  gradeIds: z.array(z.string().uuid()),
});

type RouteProps = {
  params: Promise<{
    tutorId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { tutorId } = await params;
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Only admins can update tutors." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const { gradeIds } = parsed.data;

    await admin
      .from("tutor_grades")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("tutor_id", tutorId);

    for (const gradeId of gradeIds) {
      const { error } = await admin.from("tutor_grades").upsert(
        {
          tutor_id: tutorId,
          grade_id: gradeId,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "tutor_id,grade_id",
        }
      );

      if (error) {
        return NextResponse.json(
          { error: "tutor_grade_update_failed", message: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UPDATE_TUTOR_SETTINGS_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected tutor settings error." },
      { status: 500 }
    );
  }
}
