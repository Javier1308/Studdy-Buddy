"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type GradeOption = {
  id: string;
  display_name: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getAcademicStageOrder(displayName: string) {
  const normalized = normalizeText(displayName);

  if (normalized.includes("primaria") || normalized.includes("primary")) return 1;
  if (normalized.includes("secundaria") || normalized.includes("secondary")) return 2;

  if (
    normalized.includes("bachillerato") ||
    normalized.includes("baccalaureate") ||
    normalized.startsWith("ib ") ||
    normalized.includes(" ib ") ||
    normalized.includes("international baccalaureate")
  ) return 3;

  if (normalized.includes("igcse")) return 4;

  return 99;
}

function getGradeLevelOrder(displayName: string) {
  const normalized = normalizeText(displayName);

  if (
    normalized.includes("1ro") ||
    normalized.includes("1er") ||
    normalized.includes("1°") ||
    normalized.includes("1 ") ||
    normalized.includes("primero") ||
    normalized.includes("first")
  ) return 1;

  if (
    normalized.includes("2do") ||
    normalized.includes("2°") ||
    normalized.includes("2 ") ||
    normalized.includes("segundo") ||
    normalized.includes("second")
  ) return 2;

  if (
    normalized.includes("3ro") ||
    normalized.includes("3°") ||
    normalized.includes("3 ") ||
    normalized.includes("tercero") ||
    normalized.includes("third")
  ) return 3;

  if (
    normalized.includes("4to") ||
    normalized.includes("4°") ||
    normalized.includes("4 ") ||
    normalized.includes("cuarto") ||
    normalized.includes("fourth")
  ) return 4;

  if (
    normalized.includes("5to") ||
    normalized.includes("5°") ||
    normalized.includes("5 ") ||
    normalized.includes("quinto") ||
    normalized.includes("fifth")
  ) return 5;

  if (
    normalized.includes("6to") ||
    normalized.includes("6°") ||
    normalized.includes("6 ") ||
    normalized.includes("sexto") ||
    normalized.includes("sixth")
  ) return 6;

  return 99;
}

function sortGrades(grades: GradeOption[]) {
  return [...grades].sort((a, b) => {
    const stageA = getAcademicStageOrder(a.display_name);
    const stageB = getAcademicStageOrder(b.display_name);

    if (stageA !== stageB) return stageA - stageB;

    const levelA = getGradeLevelOrder(a.display_name);
    const levelB = getGradeLevelOrder(b.display_name);

    if (levelA !== levelB) return levelA - levelB;

    return a.display_name.localeCompare(b.display_name);
  });
}

function arraysHaveSameValues(first: string[], second: string[]) {
  const normalizedFirst = [...first].sort();
  const normalizedSecond = [...second].sort();

  return (
    normalizedFirst.length === normalizedSecond.length &&
    normalizedFirst.every((value, index) => value === normalizedSecond[index])
  );
}

export function StudentGradeChangeRequestForm({
  grades,
  currentGradeId,
  hasPendingRequest,
}: {
  grades: GradeOption[];
  currentGradeId: string | null;
  hasPendingRequest: boolean;
}) {
  const router = useRouter();

  const sortedGrades = useMemo(() => sortGrades(grades), [grades]);
  const currentGrade = sortedGrades.find((grade) => grade.id === currentGradeId);

  const [selectedGradeId, setSelectedGradeId] = useState(currentGradeId ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedGrade = sortedGrades.find((grade) => grade.id === selectedGradeId);
  const selectedGradeIsCurrent = selectedGradeId === currentGradeId;

  async function submitRequest() {
    setLoading(true);
    setMessage("");
    setError("");

    if (!selectedGradeId) {
      setError("Selecciona un grado.");
      setLoading(false);
      return;
    }

    if (selectedGradeIsCurrent) {
      setError("El grado seleccionado es igual al grado actual.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/profile/update-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType: "student_grade_change",
          requestedGradeId: selectedGradeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo enviar la solicitud.");
        return;
      }

      setMessage("Solicitud enviada correctamente. Un administrador debe revisarla.");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (hasPendingRequest) {
    return (
      <div className="mt-4 rounded-lg bg-[#F7F5F0] p-4 text-sm font-semibold text-[#5A6B73]">
        Ya tienes una solicitud de cambio de grado pendiente de revisión.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] p-4">
      <h3 className="text-sm font-extrabold text-[#1C2E36]">
        Solicitar cambio de grado
      </h3>

      <p className="mt-1 text-xs text-[#5A6B73]">
        Grado actual:{" "}
        <strong>{currentGrade?.display_name ?? "sin grado asignado"}</strong>. El cambio debe ser aprobado por un administrador.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="relative">
          <label className="mb-2 block text-sm font-semibold">
            Nuevo grado solicitado
          </label>

          <button
            type="button"
            onClick={() => setIsOpen((current) => !current)}
            className="flex w-full items-center justify-between rounded-lg border border-[#CFC8BB] bg-white px-4 py-3 text-left text-sm font-semibold text-[#1C2E36] shadow-sm outline-none transition hover:border-[#2E6F87] focus:border-[#2E6F87] focus:ring-2 focus:ring-[#E0EFEF]"
          >
            <span>{selectedGrade?.display_name ?? "Selecciona un grado"}</span>
            <span className="ml-3 text-[#5A6B73]">{isOpen ? "▲" : "▼"}</span>
          </button>

          {isOpen && (
            <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-[#E2DFD7] bg-white p-2 shadow-[0_14px_40px_rgba(28,46,54,.16)]">
              {sortedGrades.map((grade) => {
                const isSelected = grade.id === selectedGradeId;
                const isCurrent = grade.id === currentGradeId;

                return (
                  <button
                    key={grade.id}
                    type="button"
                    onClick={() => {
                      setSelectedGradeId(grade.id);
                      setIsOpen(false);
                      setMessage("");
                      setError("");
                    }}
                    className={[
                      "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                      isSelected
                        ? "bg-[#E0EFEF] font-extrabold text-[#1C2E36]"
                        : "font-semibold text-[#5A6B73] hover:bg-[#F7F5F0] hover:text-[#1C2E36]",
                    ].join(" ")}
                  >
                    <span>{grade.display_name}</span>

                    {isCurrent && (
                      <span className="rounded-full bg-[#F7F5F0] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5A6B73]">
                        Actual
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedGradeIsCurrent && selectedGradeId && (
            <p className="mt-2 text-xs font-semibold text-[#8A6D1D]">
              Selecciona un grado distinto al actual para enviar una solicitud.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={submitRequest}
          disabled={loading || !selectedGradeId || selectedGradeIsCurrent}
          className="rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function TutorGradesChangeRequestForm({
  grades,
  currentGradeIds,
  hasPendingRequest,
}: {
  grades: GradeOption[];
  currentGradeIds: string[];
  hasPendingRequest: boolean;
}) {
  const router = useRouter();

  const sortedGrades = useMemo(() => sortGrades(grades), [grades]);

  const [selectedGradeIds, setSelectedGradeIds] = useState<string[]>(currentGradeIds);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedIsCurrent = arraysHaveSameValues(selectedGradeIds, currentGradeIds);

  const currentGradeNames = sortedGrades
    .filter((grade) => currentGradeIds.includes(grade.id))
    .map((grade) => grade.display_name);

  function toggleGrade(gradeId: string) {
    setMessage("");
    setError("");

    setSelectedGradeIds((current) =>
      current.includes(gradeId)
        ? current.filter((id) => id !== gradeId)
        : [...current, gradeId]
    );
  }

  async function submitRequest() {
    setLoading(true);
    setMessage("");
    setError("");

    if (selectedGradeIds.length === 0) {
      setError("Selecciona al menos un grado.");
      setLoading(false);
      return;
    }

    if (selectedIsCurrent) {
      setError("Los grados seleccionados son iguales a los actuales.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/profile/update-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestType: "tutor_grades_change",
          requestedGradeIds: selectedGradeIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo enviar la solicitud.");
        return;
      }

      setMessage("Solicitud enviada correctamente. Un administrador debe revisarla.");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (hasPendingRequest) {
    return (
      <div className="mt-4 rounded-lg bg-[#F7F5F0] p-4 text-sm font-semibold text-[#5A6B73]">
        Ya tienes una solicitud de cambio de grados pendiente de revisión.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] p-4">
      <h3 className="text-sm font-extrabold text-[#1C2E36]">
        Solicitar cambio de grados que enseñas
      </h3>

      <p className="mt-1 text-xs text-[#5A6B73]">
        Grados actuales:{" "}
        <strong>
          {currentGradeNames.length > 0
            ? currentGradeNames.join(", ")
            : "sin grados asignados"}
        </strong>
        . El cambio debe ser aprobado por un administrador.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {sortedGrades.map((grade) => {
          const isSelected = selectedGradeIds.includes(grade.id);
          const isCurrent = currentGradeIds.includes(grade.id);

          return (
            <button
              key={grade.id}
              type="button"
              onClick={() => toggleGrade(grade.id)}
              className={[
                "flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm font-semibold transition",
                isSelected
                  ? "border-[#9FD0CF] bg-[#E0EFEF] text-[#1C2E36]"
                  : "border-[#E2DFD7] bg-white text-[#5A6B73] hover:bg-[#FBFAF7]",
              ].join(" ")}
            >
              <span>{grade.display_name}</span>

              <span className="ml-3 flex items-center gap-2">
                {isCurrent && (
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5A6B73]">
                    Actual
                  </span>
                )}

                <span>{isSelected ? "✓" : "+"}</span>
              </span>
            </button>
          );
        })}
      </div>

      {selectedIsCurrent && selectedGradeIds.length > 0 && (
        <p className="mt-3 text-xs font-semibold text-[#8A6D1D]">
          Selecciona una combinación distinta a la actual para enviar una solicitud.
        </p>
      )}

      <button
        type="button"
        onClick={submitRequest}
        disabled={loading || selectedGradeIds.length === 0 || selectedIsCurrent}
        className="mt-4 rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar solicitud"}
      </button>

      {message && (
        <p className="mt-3 rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
