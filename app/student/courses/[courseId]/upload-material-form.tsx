"use client";

import { useRouter } from "next/navigation";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt", "md"];

function getExtension(filename: string) {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateFile(selectedFile: File) {
  const extension = getExtension(selectedFile.name);

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return "Solo puedes subir PDF, DOCX, TXT o Markdown.";
  }

  if (selectedFile.size > MAX_FILE_SIZE) {
    return "El archivo no debe superar 5 MB.";
  }

  return "";
}

function formatFileSize(size: number) {
  const mb = size / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

export function UploadMaterialForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "extracting">("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function clearUploadNotice() {
      setMessage("");
      setError("");
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }

    window.addEventListener("material:resolved", clearUploadNotice);

    return () => {
      window.removeEventListener("material:resolved", clearUploadNotice);
    };
  }, []);

  function setSelectedFile(selectedFile: File | null) {
    setMessage("");
    setError("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const validationError = validateFile(selectedFile);

    if (validationError) {
      setError(validationError);
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    setFile(selectedFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    setSelectedFile(selectedFile);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);

    if (loading) return;

    const selectedFile = event.dataTransfer.files?.[0] ?? null;
    setSelectedFile(selectedFile);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!loading) {
      setDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }

  function openFilePicker() {
    if (loading) return;
    inputRef.current?.click();
  }

  async function handleUpload() {
    if (!file) return;

    setLoading(true);
    setError("");
    setMessage("");
    setStage("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", courseId);

      const uploadResponse = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setError(uploadData.message ?? "No se pudo subir el archivo.");
        return;
      }

      setStage("extracting");

      const startedAt = Date.now();

      const extractResponse = await fetch(
        `/api/files/${uploadData.uploadedFileId}/extract`,
        { method: "POST" }
      );

      const elapsed = Date.now() - startedAt;

      if (elapsed < 700) {
        await sleep(700 - elapsed);
      }

      const extractData = await extractResponse.json();

      if (!extractResponse.ok) {
        setError(extractData.message ?? "El archivo subió, pero no se pudo extraer.");
        router.refresh();
        return;
      }

      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }

      setMessage("Material subido y extraído. Revisa el contenido antes de confirmarlo.");

      router.push(`/student/courses/${courseId}?review=${uploadData.uploadedFileId}`);
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
      setStage("idle");
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#E2DFD7] bg-[#F7F5F0] p-5">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-extrabold tracking-[-0.03em] text-[#1C2E36]">
          Subir material académico
        </h3>

        <p className="text-sm text-[#5A6B73]">
          Arrastra un archivo aquí o selecciónalo desde tu equipo. Formatos permitidos:
          PDF, DOCX, TXT o Markdown. Máximo 5 MB.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        onChange={handleFileChange}
        disabled={loading}
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={[
          "mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition",
          dragging
            ? "border-[#2E6F87] bg-[#E0EFEF]"
            : "border-[#CFC8BB] bg-white hover:border-[#2E6F87] hover:bg-[#FBFAF7]",
          loading ? "cursor-not-allowed opacity-70" : "",
        ].join(" ")}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E0EFEF] text-2xl">
          📄
        </div>

        <p className="mt-4 text-base font-extrabold tracking-[-0.02em] text-[#1C2E36]">
          {dragging ? "Suelta el archivo aquí" : "Arrastra tu material aquí"}
        </p>

        <p className="mt-1 text-sm text-[#5A6B73]">
          o haz click para buscarlo en tu computadora
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {ALLOWED_EXTENSIONS.map((extension) => (
            <span
              key={extension}
              className="rounded-full bg-[#F7F5F0] px-3 py-1 text-xs font-bold uppercase text-[#5A6B73]"
            >
              .{extension}
            </span>
          ))}
        </div>
      </div>

      {file && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#E2DFD7] bg-white p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-[#1C2E36]">
              {file.name}
            </p>

            <p className="mt-1 text-xs font-medium text-[#5A6B73]">
              {formatFileSize(file.size)} · Listo para subir
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setFile(null);
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            disabled={loading}
            className="rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#5A6B73] hover:bg-[#F7F5F0] disabled:opacity-60"
          >
            Cambiar archivo
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-4 rounded-lg bg-[#E0EFEF] px-4 py-3 text-sm font-semibold text-[#1C2E36]">
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={loading || !file}
        className="mt-5 w-full rounded-xl bg-[#2E6F87] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1F4E60] disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
      >
        {stage === "uploading" && "Subiendo material..."}
        {stage === "extracting" && "Extrayendo contenido..."}
        {stage === "idle" && "Subir y extraer material"}
      </button>
    </div>
  );
}
