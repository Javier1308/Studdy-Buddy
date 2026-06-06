import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const schema = z.object({
  gradeId: z.string().uuid(),
});

type RouteProps = {
  params: Promise<{
    studentId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { studentId } = await params;
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
        { error: "forbidden", message: "Only admins can update student grades." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { error } = await admin
      .from("students")
      .update({
        grade_id: parsed.data.gradeId,
      })
      .eq("id", studentId);

    if (error) {
      return NextResponse.json(
        { error: "grade_update_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UPDATE_STUDENT_GRADE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected grade update error." },
      { status: 500 }
    );
  }
}
