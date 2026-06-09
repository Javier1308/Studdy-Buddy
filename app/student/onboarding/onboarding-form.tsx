"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ONBOARDING_QUESTIONS, OnboardingAnswers } from "@/lib/onboarding/questions";

const isLastStep = (step: number) => step === ONBOARDING_QUESTIONS.length - 1;

export function OnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({});
  const [q6CustomText, setQ6CustomText] = useState("");
  const [q6CustomError, setQ6CustomError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = ONBOARDING_QUESTIONS[currentStep];

  const handleSelectOption = (code: "A" | "B" | "C" | "D" | "E") => {
    const questionId = question.id as keyof OnboardingAnswers;
    const updatedAnswers = { ...answers, [questionId]: code };
    setAnswers(updatedAnswers);

    if (question.id === "q6" && code === "E") {
      // Stay on step so the user can fill in the custom text
      return;
    }

    if (!isLastStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
    // Last step: do not auto-submit — wait for "Finalizar" click
  };

  const handleAdvanceFromQ6 = () => {
    const trimmed = q6CustomText.trim();
    if (!trimmed || trimmed.length < 2) {
      setQ6CustomError("Por favor escribe tu interés antes de continuar (mínimo 2 caracteres).");
      return;
    }
    setQ6CustomError(null);
    setCurrentStep(currentStep + 1);
  };

  const submitOnboarding = async (finalAnswers: OnboardingAnswers) => {
    setLoading(true);
    setError(null);

    const payload: OnboardingAnswers = {
      ...finalAnswers,
      ...(finalAnswers.q6 === "E" ? { q6_custom_text: q6CustomText.trim() } : {}),
    };

    try {
      const response = await fetch("/api/student/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
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

  const handleFinalizar = () => {
    if (answers.q8) {
      submitOnboarding(answers as OnboardingAnswers);
    }
  };

  const showQ6CustomInput = question.id === "q6" && answers.q6 === "E";
  const showFinalizarButton = isLastStep(currentStep);

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
                onClick={() => !loading && handleSelectOption(option.code)}
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

        {/* Q6 custom text input */}
        {showQ6CustomInput && (
          <div className="mt-4">
            <input
              type="text"
              value={q6CustomText}
              onChange={(e) => {
                setQ6CustomText(e.target.value);
                setQ6CustomError(null);
              }}
              placeholder="Ej. astronomía, cocina, viajes..."
              maxLength={120}
              disabled={loading}
              className="w-full border border-[#E2DFD7] rounded-lg p-3 text-[#1C2E36] focus:outline-none focus:border-[#2E6F87] disabled:opacity-50"
            />
            {q6CustomError && (
              <p className="mt-1 text-sm text-red-600">{q6CustomError}</p>
            )}
            <button
              onClick={handleAdvanceFromQ6}
              disabled={loading}
              className="mt-3 w-full bg-[#2E6F87] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#255a70] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Finalizar button on last question */}
        {showFinalizarButton && (
          <button
            onClick={handleFinalizar}
            disabled={!answers.q8 || loading}
            className="mt-6 w-full bg-[#2E6F87] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#255a70] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Guardando..." : "Finalizar"}
          </button>
        )}

        {/* Atrás button */}
        {currentStep > 0 && !loading && (
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="mt-4 text-sm text-[#5A6B73] hover:text-[#2E6F87] underline block"
          >
            ← Atrás
          </button>
        )}
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
