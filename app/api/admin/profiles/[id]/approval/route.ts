import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional().default(""),
});

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { id } = await params;
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

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id, role, email")
      .eq("id", user.id)
      .single();

    if (adminProfile?.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Only admins can approve accounts." },
        { status: 403 }
      );
    }

    if (id === adminProfile.id) {
      return NextResponse.json(
        { error: "cannot_update_self", message: "You cannot change your own approval status." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const updatePayload =
      parsed.data.action === "approve"
        ? {
            approval_status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: adminProfile.id,
            rejection_reason: null,
          }
        : {
            approval_status: "rejected",
            approved_at: null,
            approved_by: null,
            rejection_reason: parsed.data.rejectionReason || "Cuenta rechazada por administrador.",
          };

    const { error } = await admin
      .from("profiles")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "approval_update_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PROFILE_APPROVAL_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected profile approval error." },
      { status: 500 }
    );
  }
}
