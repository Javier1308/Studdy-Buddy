import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "student") {
    redirect("/student/dashboard");
  }

  if (profile.role === "tutor") {
    redirect("/tutor/dashboard");
  }

  if (profile.role === "admin") {
    redirect("/admin/dashboard");
  }

  redirect("/login");
}
