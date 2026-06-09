"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_QUESTIONS, OnboardingAnswers } from "@/lib/onboarding/questions";

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = ONBOARDING_QUESTIONS[currentStep];

  const handleSelectOption = async (code: "A" | "B" | "C" | "D") => {
    const questionId = question.id as keyof OnboardingAnswers;
    const updatedAnswers = { ...answers, [questionId]: code };
    setAnswers(updatedAnswers);

    if (currentStep === ONBOARDING_QUESTIONS.length - 1) {
      // Last question - submit the form
      await submitOnboarding(updatedAnswers as OnboardingAnswers);
    } else {
      // Move to next question
      setCurrentStep(currentStep + 1);
    }
  };

  const submitOnboarding = async (finalAnswers: OnboardingAnswers) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/student/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save onboarding");
      }

      router.push("/student/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <p className="text-sm font-medium text-[#5BA8AC]">
          Pregunta {currentStep + 1} de {ONBOARDING_QUESTIONS.length}
        </p>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#2E6F87] h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentStep + 1) / ONBOARDING_QUESTIONS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl border border-[#E2DFD7] shadow-[0_4px_12px_rgba(46,111,135,.10)] p-8 mb-8">
        <h2 className="text-xl font-semibold text-[#1C2E36] mb-8">
          {question.text}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = answers[question.id as keyof OnboardingAnswers] === option.code;
            return (
              <button
                key={option.code}
                onClick={() => !loading && handleSelectOption(option.code as "A" | "B" | "C" | "D")}
                disabled={loading}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-[#2E6F87] bg-[#E0EFEF] text-[#1C2E36]"
                    : "border-[#E2DFD7] bg-white text-[#1C2E36] hover:border-[#2E6F87]"
                } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-start gap-3">
                  <div className="font-semibold text-[#2E6F87] min-w-fit">{option.code}.</div>
                  <div className="text-base leading-relaxed">{option.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-4">
          <p className="text-sm text-[#5A6B73]">Guardando tu perfil...</p>
        </div>
      )}
    </div>
  );
}
