import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const roleSchema = z.object({
  role: z.enum(["student", "tutor", "admin"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

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

    const { data: requesterProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (requesterProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Only admins can change roles." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const newRole = parsed.data.role;

    const { data: targetProfile } = await admin
      .from("profiles")
      .select("email, role")
      .eq("id", id)
      .single();

    if (targetProfile?.email === "admin@example.com") {
      return NextResponse.json(
        {
          error: "protected_admin",
          message: "This admin role can only be changed directly from Supabase.",
        },
        { status: 403 }
      );
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id);

    if (profileError) {
      return NextResponse.json(
        { error: "role_update_failed", message: profileError.message },
        { status: 500 }
      );
    }

    if (newRole === "student") {
      await admin.from("tutors").delete().eq("profile_id", id);

      const { error: studentError } = await admin.from("students").upsert(
        { profile_id: id },
        { onConflict: "profile_id" }
      );

      if (studentError) {
        return NextResponse.json(
          { error: "student_row_failed", message: studentError.message },
          { status: 500 }
        );
      }
    }

    if (newRole === "tutor") {
      await admin.from("students").delete().eq("profile_id", id);

      const { error: tutorError } = await admin.from("tutors").upsert(
        { profile_id: id },
        { onConflict: "profile_id" }
      );

      if (tutorError) {
        return NextResponse.json(
          { error: "tutor_row_failed", message: tutorError.message },
          { status: 500 }
        );
      }
    }

    if (newRole === "admin") {
      await admin.from("students").delete().eq("profile_id", id);
      await admin.from("tutors").delete().eq("profile_id", id);
    }

    return NextResponse.json({
      success: true,
      message: `Role updated to ${newRole}.`,
    });
  } catch (error) {
    console.error("ROLE_UPDATE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected role update error." },
      { status: 500 }
    );
  }
}
