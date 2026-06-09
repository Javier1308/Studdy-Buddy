import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const user = await getApprovedUserOrRedirect();

  const supabase = await createServerSupabaseClient();
  const { data: student } = await supabase
    .from("students")
    .select("id, onboarding_completed_at")
    .eq("profile_id", user.id)
    .single();

  if (student?.onboarding_completed_at) {
    redirect("/student/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#F7F5F0] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo / Brand mark */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6">
            <div className="w-12 h-12 bg-[#2E6F87] rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-[#1C2E36] mb-2">
            Cuéntanos cómo aprendes mejor
          </h1>
          <p className="text-[#5A6B73] text-base">
            Estas preguntas nos ayudan a personalizar tu experiencia con Buddy IA.
          </p>
        </div>

        {/* Form */}
        <OnboardingForm />
      </div>
    </main>
  );
}
