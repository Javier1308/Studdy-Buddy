"use client";

import { useRouter } from "next/navigation";

type Props = {
  courseId: string;
  sessionCount: number;
};

export function SessionActions({ courseId, sessionCount }: Props) {
  const router = useRouter();

  const isAtLimit = sessionCount >= 3;

  const handleNewSession = () => {
    router.push(`/student/courses/${courseId}/chat?new=1`);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleNewSession}
        disabled={isAtLimit}
        className={`w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
          isAtLimit
            ? "cursor-not-allowed bg-gray-200 text-gray-500"
            : "bg-[#2E6F87] text-white hover:bg-[#1F4E60]"
        }`}
      >
        Nuevo chat
      </button>

      {isAtLimit && (
        <p className="mt-2 text-xs text-[#5A6B73]">
          Máximo 3 chats por curso. Elimina uno para crear otro.
        </p>
      )}
    </div>
  );
}
