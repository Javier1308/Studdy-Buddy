"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function BackButton({
  label = "Regresar",
  fallbackHref,
}: {
  label?: string;
  fallbackHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleBack() {
    startTransition(() => {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push(fallbackHref);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      disabled={isPending}
      className="mb-6 inline-flex cursor-pointer items-center rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#1C2E36] shadow-[0_1px_2px_rgba(46,111,135,.06)] hover:bg-[#E0EFEF] disabled:opacity-60"
    >
      {isPending ? "Volviendo..." : `← ${label}`}
    </button>
  );
}
