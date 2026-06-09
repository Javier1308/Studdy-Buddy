import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { BackButton } from "@/components/navigation/back-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UploadMaterialForm } from "./upload-material-form";
import { AutoExtractFile } from "./auto-extract-file";
import { ReviewExtractedMaterial } from "./review-extracted-material";
import { DeleteMaterialButton } from "./delete-material-button";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getStudentCourseAccessContext } from "@/lib/auth/course-access";

type PageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

type UploadedFile = {
  id: string;
  original_filename: string | null;
  file_type: string | null;
  extraction_status: string | null;
  created_at: string;
};

export default async function StudentCoursePage({ params }: PageProps) {
  const approvedUser = await getApprovedUserOrRedirect();
  const { courseId } = await params;

  const studentCourseAccess = await getStudentCourseAccessContext({
    user: approvedUser,
    courseId,
  });

  if (!studentCourseAccess) {
    notFound();
  }

  const supabase = await createServerSupabaseClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const student = {
    id: studentCourseAccess.studentId,
  };

  const [
    { data: course },
    { data: studentRecord },
    { data: assignment },
    { data: context },
    { data: uploadedFiles },
  ] = await Promise.all([
    admin.from("courses").select("id, name").eq("id", courseId).is("deleted_at", null).single(),

    admin
      .from("students")
      .select("id, active_personalization_md")
      .eq("profile_id", user.id)
      .maybeSingle(),

    admin
      .from("student_course_tutors")
      .select("id, active_skill_md, active_skill_survey_id")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .eq("is_active", true)
      .maybeSingle(),

    admin
      .from("course_contexts")
      .select("storage_path, compile_status")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .maybeSingle(),

    admin
      .from("uploaded_files")
      .select(
        "id, original_filename, file_type, extraction_status, created_at"
      )
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (!course || !assignment) {
    notFound();
  }

  const files = (uploadedFiles ?? []) as UploadedFile[];

  const hasPersonalization = Boolean(studentRecord?.active_personalization_md);
  const hasTutorEnrichment = Boolean(assignment.active_skill_md);
  const hasCompiledContext =
    context?.compile_status === "completed" && Boolean(context?.storage_path);

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <Link
            prefetch={false}
            href="/student/dashboard"
            className="inline-block -rotate-[6deg] bg-[#2E6F87] px-4 py-2"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
              Studdy Buddy
            </p>
          </Link>

          <LogoutButton />
        </div>

        <BackButton label="Volver al panel" fallbackHref="/student/dashboard" />

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Curso
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {course.name}
          </h1>

          <p className="mt-3 text-[#5A6B73]">
            Personalización:{" "}
            <strong>{hasPersonalization ? "activa" : "pendiente"}</strong> · Material:{" "}
            <strong>{hasCompiledContext ? "compilado" : "pendiente"}</strong>
            {hasTutorEnrichment && (
              <>
                {" · "}
                Enriquecimiento del tutor: <strong>activo</strong>
              </>
            )}
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
            Buddy IA
          </h2>

          <p className="mt-2 text-sm text-[#5A6B73]">
            El chat requiere tu perfil de personalización y material confirmado del curso.
          </p>

          <div className="mt-5">
            {hasPersonalization && hasCompiledContext ? (
              <Link
                prefetch={false}
                href={`/student/courses/${courseId}/chat`}
                className="inline-block rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60]"
              >
                Abrir chat con Buddy IA
              </Link>
            ) : (
              <div className="rounded-lg bg-[#F7F5F0] p-5">
                <p className="font-bold">Buddy IA aún no está disponible.</p>
                <p className="mt-2 text-sm text-[#5A6B73]">
                  {!hasPersonalization ? (
                    <>
                      Primero debes{" "}
                      <Link
                        href="/student/onboarding"
                        className="font-semibold text-[#2E6F87] underline hover:text-[#1F4E60]"
                      >
                        completar tu perfil de personalización
                      </Link>
                      .
                    </>
                  ) : (
                    "También necesitas confirmar material del curso para que Buddy IA responda con contexto."
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
            Material del curso
          </h2>

          <p className="mt-2 text-sm text-[#5A6B73]">
            Sube material académico para que Buddy IA responda usando el contexto de este curso.
          </p>

          <UploadMaterialForm courseId={courseId} />

          <div className="mt-6 rounded-lg bg-[#F7F5F0] p-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-[#5BA8AC]">
              Materiales subidos
            </h3>

            <div className="mt-4 space-y-4">
              {files.map((file) => {
                const extractionStatus = file.extraction_status ?? "pending";
                return (
                  <div
                    key={file.id}
                    className="rounded-lg border border-[#E2DFD7] bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-bold">
                          {file.original_filename ?? "Material sin nombre"}
                        </p>

                        <p className="mt-1 text-sm text-[#5A6B73]">
                          Tipo: {file.file_type ?? "desconocido"} · Extracción:{" "}
                          <strong>{extractionStatus}</strong>
                        </p>

                        <p className="mt-1 text-xs text-[#5A6B73]">
                          Subido el{" "}
                          {new Date(file.created_at).toLocaleDateString("es-PE")}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {extractionStatus === "pending" ||
                        extractionStatus === "uploaded" ? (
                          <AutoExtractFile fileId={file.id} />
                        ) : extractionStatus === "needs_review" ? (
                          <Suspense fallback={null}>
                            <ReviewExtractedMaterial fileId={file.id} />
                          </Suspense>
                        ) : extractionStatus === "completed" ? (
                          <>
                            <span className="rounded-lg bg-[#E0EFEF] px-4 py-2 text-sm font-semibold text-[#1C2E36]">
                              Material confirmado
                            </span>

                            <DeleteMaterialButton fileId={file.id} isConfirmed />
                          </>
                        ) : (
                          <span className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
                            Requiere revisión
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {files.length === 0 && (
                <p className="text-sm text-[#5A6B73]">
                  Todavía no hay materiales subidos para este curso.
                </p>
              )}
            </div>
          </div>
        </div>


      </section>
    </main>
  );
}
