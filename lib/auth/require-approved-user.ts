import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ApprovedUser = {
  id: string;
  email: string;
  role: "student" | "tutor" | "admin";
  approvalStatus: "pending" | "approved" | "rejected";
};

export async function getApprovedUserOrRedirect(): Promise<ApprovedUser> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.email_confirmed_at) {
    redirect("/verify-email");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, role, approval_status")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.approval_status === "pending") {
    redirect("/pending-approval");
  }

  if (profile.approval_status === "rejected") {
    redirect("/account-rejected");
  }

  return {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    approvalStatus: profile.approval_status,
  };
}
