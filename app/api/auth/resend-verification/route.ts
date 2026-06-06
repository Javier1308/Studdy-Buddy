import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const COOLDOWN_SECONDS = 60;

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not authenticated." },
        { status: 401 }
      );
    }

    if (user.email_confirmed_at) {
      return NextResponse.json(
        { error: "already_verified", message: "Tu correo ya está verificado." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: lastLog } = await admin
      .from("email_verification_resend_logs")
      .select("sent_at")
      .eq("profile_id", user.id)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLog?.sent_at) {
      const lastSentAt = new Date(lastLog.sent_at).getTime();
      const elapsedSeconds = Math.floor((Date.now() - lastSentAt) / 1000);
      const remainingSeconds = COOLDOWN_SECONDS - elapsedSeconds;

      if (remainingSeconds > 0) {
        return NextResponse.json(
          {
            error: "cooldown_active",
            message: `Espera ${remainingSeconds} segundos antes de reenviar el correo.`,
            remainingSeconds,
          },
          { status: 429 }
        );
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: `${siteUrl}/dashboard`,
      },
    });

    if (error) {
      return NextResponse.json(
        { error: "resend_failed", message: error.message },
        { status: 500 }
      );
    }

    await admin.from("email_verification_resend_logs").insert({
      profile_id: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RESEND_VERIFICATION_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected resend verification error." },
      { status: 500 }
    );
  }
}
