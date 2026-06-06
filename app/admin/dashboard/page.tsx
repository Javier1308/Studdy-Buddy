import { LogoutButton } from "@/components/auth/logout-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminRoleActions } from "./role-actions";
import { CreateCourseForm } from "./create-course-form";
import { AccountApprovalActions } from "./account-approval-actions";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getProfileDisplayName } from "@/lib/profiles/display-name";
import { ProfileUpdateRequestActions } from "./profile-update-request-actions";
import { ProfileUpdateRequestsSection } from "./profile-update-requests-section";
import { CourseDeleteButton } from "./course-delete-button";
import { CourseRestoreButton } from "./course-restore-button";

type Profile = {
  id: string;
  email: string;
  role: "student" | "tutor" | "admin";
  created_at: string;
};

export default async function AdminDashboardPage() {
  await getApprovedUserOrRedirect();
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email, first_name, last_name, role, approval_status, created_at")
    .order("created_at", { ascending: false });

  const users = (profiles ?? []) as Profile[];
  const tutors = users.filter((profile) => profile.role === "tutor");
  const students = users.filter((profile) => profile.role === "student");

  const [
    { data: tutorRecords },
    { data: studentRecords },
    { data: courses },
    { data: grades },
    { data: tutorGrades },
    { data: academicAssignments },
  ] = await Promise.all([
    admin.from("tutors").select("id, profile_id"),
    admin.from("students").select("id, profile_id, grade_id"),
    admin.from("courses").select("id, name").is("deleted_at", null).order("name", { ascending: true }),
    admin.from("grades").select("id, display_name, sort_order").eq("is_active", true).order("sort_order", { ascending: true }),
    admin
      .from("tutor_grades")
      .select(
        `
        id,
        tutor_id,
        grade_id,
        grades (
          id,
          display_name
        )
      `
      )
      .eq("is_active", true),
    admin
      .from("student_course_tutors")
      .select(
        `
        id,
        students (
          id,
          profiles (
            
            email
          )
        ),
        courses (
          id,
          name
        ),
        tutors (
          id,
          profiles (
            
            email
          )
        )
      `
      )
      .eq("is_active", true)
      .order("assigned_at", { ascending: false }),
  ]);

  const tutorOptions = tutors
    .map((profile) => {
      const tutorRecord = (tutorRecords ?? []).find(
        (record) => record.profile_id === profile.id
      );

      if (!tutorRecord) return null;

      return {
        tutorId: tutorRecord.id,
        name: getProfileDisplayName(profile),
        email: profile.email,
      };
    })
    .filter(Boolean) as {
    tutorId: string;
    name: string;
    email: string;
  }[];

  const studentOptions = students
    .map((profile) => {
      const studentRecord = (studentRecords ?? []).find(
        (record) => record.profile_id === profile.id
      );

      if (!studentRecord) return null;

      const grade = (grades ?? []).find((item) => item.id === studentRecord.grade_id);

      return {
        studentId: studentRecord.id,
        name: getProfileDisplayName(profile),
        email: profile.email,
        gradeId: studentRecord.grade_id ?? null,
        gradeName: grade?.display_name ?? null,
      };
    })
    .filter(Boolean) as {
    studentId: string;
    name: string;
    email: string;
    gradeId: string | null;
    gradeName: string | null;
  }[];

  const tutorOptionsWithGrades = tutorOptions.map((tutor) => {
    const tutorGradeRows = (tutorGrades ?? [])
      .filter((row: any) => row.tutor_id === tutor.tutorId)
      .map((row: any) => {
        const grade = Array.isArray(row.grades) ? row.grades[0] : row.grades;

        return {
          tutorGradeId: row.id,
          gradeName: grade?.display_name ?? "",
        };
      })
      .filter((row) => row.gradeName);

    return {
      ...tutor,
      gradeNames: tutorGradeRows.map((row) => row.gradeName),
      tutorGrades: tutorGradeRows,
    };
  });

  const assignmentRows = (academicAssignments ?? []).map((assignment: any) => {
    const studentProfile = Array.isArray(assignment.students?.profiles)
      ? assignment.students?.profiles[0]
      : assignment.students?.profiles;

    const tutorProfile = Array.isArray(assignment.tutors?.profiles)
      ? assignment.tutors?.profiles[0]
      : assignment.tutors?.profiles;

    const course = Array.isArray(assignment.courses)
      ? assignment.courses[0]
      : assignment.courses;

    return {
      id: assignment.id,
      studentName: getProfileDisplayName(studentProfile),
      studentEmail: studentProfile?.email ?? "",
      courseName: course?.name ?? "Curso sin nombre",
      tutorName: getProfileDisplayName(tutorProfile),
      tutorEmail: tutorProfile?.email ?? "",
    };
  });


  const pendingApprovalUsers = (users ?? []).filter(
    (profile: any) => profile.approval_status === "pending"
  );


  type PendingProfileUpdateRequestRow = {
    id: string;
    profile_id: string;
    request_type: "student_grade_change" | "tutor_grades_change";
    current_value: unknown;
    requested_value: unknown;
    created_at: string;
  };

  type RequestProfile = {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: "student" | "tutor" | "admin";
  };

  function readGradeId(value: unknown) {
    if (
      typeof value === "object" &&
      value !== null &&
      "grade_id" in value &&
      typeof value.grade_id === "string"
    ) {
      return value.grade_id;
    }

    return null;
  }

  function readGradeIds(value: unknown) {
    if (
      typeof value === "object" &&
      value !== null &&
      "grade_ids" in value &&
      Array.isArray(value.grade_ids)
    ) {
      return value.grade_ids.filter(
        (gradeId): gradeId is string => typeof gradeId === "string"
      );
    }

    return [];
  }

  const {
    data: rawPendingProfileUpdateRequests,
    error: pendingProfileUpdateRequestsError,
  } = await admin
    .from("profile_update_requests")
    .select("id, profile_id, request_type, current_value, requested_value, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (pendingProfileUpdateRequestsError) {
    console.error(
      "ADMIN_PENDING_PROFILE_UPDATE_REQUESTS_ERROR",
      pendingProfileUpdateRequestsError
    );
  }

  const pendingRows =
    (rawPendingProfileUpdateRequests ?? []) as PendingProfileUpdateRequestRow[];

  const requestProfileIds = [
    ...new Set(pendingRows.map((request) => request.profile_id)),
  ];

  const { data: requestProfiles } =
    requestProfileIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, email, first_name, last_name, role")
          .in("id", requestProfileIds)
      : { data: [] };

  const requestProfileMap = new Map(
    ((requestProfiles ?? []) as RequestProfile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const requestGradeIds = [
    ...new Set(
      pendingRows.flatMap((request) => [
        readGradeId(request.current_value),
        readGradeId(request.requested_value),
        ...readGradeIds(request.current_value),
        ...readGradeIds(request.requested_value),
      ]).filter((gradeId): gradeId is string => Boolean(gradeId))
    ),
  ];

  const { data: requestGrades } =
    requestGradeIds.length > 0
      ? await admin
          .from("grades")
          .select("id, display_name")
          .in("id", requestGradeIds)
      : { data: [] };

  const requestGradeMap = new Map(
    ((requestGrades ?? []) as { id: string; display_name: string }[]).map(
      (grade) => [grade.id, grade.display_name]
    )
  );

  function formatRequestValue(
    requestType: PendingProfileUpdateRequestRow["request_type"],
    value: unknown
  ) {
    if (requestType === "student_grade_change") {
      const gradeId = readGradeId(value);

      return gradeId
        ? requestGradeMap.get(gradeId) ?? gradeId
        : "Sin grado";
    }

    const gradeIds = readGradeIds(value);

    if (gradeIds.length === 0) {
      return "Sin grados";
    }

    return gradeIds
      .map((gradeId) => requestGradeMap.get(gradeId) ?? gradeId)
      .join(", ");
  }

  const pendingProfileUpdateRequests = pendingRows.map((request) => ({
    ...request,
    profiles: requestProfileMap.get(request.profile_id) ?? null,
    current_value: {
      label: formatRequestValue(request.request_type, request.current_value),
    },
    requested_value: {
      label: formatRequestValue(request.request_type, request.requested_value),
    },
  }));


  const { data: adminCourses } = await admin
    .from("courses")
    .select("id, name, slug, created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { data: deletedCourses } = await admin
    .from("courses")
    .select("id, name, slug, created_at, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="inline-block -rotate-[6deg] bg-[#2E6F87] px-4 py-2">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white">
              Studdy Buddy
            </p>
          </div>

          
          <a
            href="/profile"
            className="rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#F7F5F0]"
          >
            Ver perfil
          </a>

          <LogoutButton />
        </div>

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Panel de admin
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            Gestión de Studdy Buddy.
          </h1>

          <p className="mt-3 text-[#5A6B73]">
            Administra usuarios, roles y permisos iniciales.
          </p>
        </div>

        <CreateCourseForm />




        <div className="mt-6 overflow-hidden rounded-2xl border border-[#E2DFD7] bg-white shadow-[0_8px_24px_rgba(46,111,135,.10)]">
          <div className="flex flex-col gap-3 border-b border-[#E2DFD7] bg-[#FBFAF7] p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#5BA8AC]">
                Gestión académica
              </p>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                Cursos
              </h2>

              <p className="mt-2 text-sm text-[#5A6B73]">
                Administra los cursos disponibles. Al eliminar un curso, se desactivan sus asignaciones activas.
              </p>
            </div>

            <span className="w-fit rounded-full bg-[#E0EFEF] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#1C2E36]">
              {(adminCourses ?? []).length} curso{(adminCourses ?? []).length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="divide-y divide-[#E2DFD7]">
            {(adminCourses ?? []).map((course: any) => (
              <div
                key={course.id}
                className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-[#1C2E36]">
                    {course.name}
                  </p>

                  <p className="mt-1 text-sm text-[#5A6B73]">
                    Slug: {course.slug}
                  </p>

                  <p className="mt-1 break-all text-xs font-semibold text-[#5A6B73]">
                    ID: {course.id}
                  </p>
                </div>

                <CourseDeleteButton
                  courseId={course.id}
                  courseName={course.name}
                />
              </div>
            ))}

            {(adminCourses ?? []).length === 0 && (
              <div className="p-6">
                <div className="rounded-xl border border-dashed border-[#CFC8BB] bg-[#F7F5F0] p-5 text-sm font-semibold text-[#5A6B73]">
                  No hay cursos activos.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[#E2DFD7] bg-white shadow-[0_8px_24px_rgba(46,111,135,.10)]">
          <div className="flex flex-col gap-3 border-b border-[#E2DFD7] bg-[#FBFAF7] p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#5BA8AC]">
                Gestión académica
              </p>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                Cursos eliminados
              </h2>

              <p className="mt-2 text-sm text-[#5A6B73]">
                Al restaurar, el curso vuelve a ser visible, pero los alumnos y profesores permanecen inactivos hasta que reactives sus asignaciones por separado.
              </p>
            </div>

            <span className="inline-flex whitespace-nowrap rounded-full bg-[#E0EFEF] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#1C2E36]">
              {(deletedCourses ?? []).length} curso{(deletedCourses ?? []).length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="divide-y divide-[#E2DFD7]">
            {(deletedCourses ?? []).map((course: any) => (
              <div
                key={course.id}
                className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-[#1C2E36]">
                    {course.name}
                  </p>

                  <p className="mt-1 text-sm text-[#5A6B73]">
                    Slug: {course.slug}
                  </p>

                  <p className="mt-1 break-all text-xs font-semibold text-[#5A6B73]">
                    ID: {course.id}
                  </p>

                  <p className="mt-1 text-xs text-[#5A6B73]">
                    Eliminado:{" "}
                    {new Date(course.deleted_at).toLocaleDateString("es-PE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <CourseRestoreButton
                  courseId={course.id}
                  courseName={course.name}
                />
              </div>
            ))}

            {(deletedCourses ?? []).length === 0 && (
              <div className="p-6">
                <div className="rounded-xl border border-dashed border-[#CFC8BB] bg-[#F7F5F0] p-5 text-sm font-semibold text-[#5A6B73]">
                  No hay cursos eliminados.
                </div>
              </div>
            )}
          </div>
        </div>

        <ProfileUpdateRequestsSection
          requests={pendingProfileUpdateRequests ?? []}
        />

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="border-b border-[#E2DFD7] p-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
              Solicitudes de acceso
            </h2>

            <p className="mt-2 text-sm text-[#5A6B73]">
              Usuarios registrados que esperan aprobación administrativa.
            </p>
          </div>

          <div className="divide-y divide-[#E2DFD7]">
            {pendingApprovalUsers.map((profile: any) => (
              <div
                key={profile.id}
                className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold">
                    {profile.first_name || getProfileDisplayName(profile)}{" "}
                    {profile.last_name ?? ""}
                  </p>

                  <p className="text-sm text-[#5A6B73]">{profile.email}</p>

                  <p className="mt-1 text-xs font-semibold uppercase text-[#5BA8AC]">
                    Rol solicitado: {profile.role}
                  </p>
                </div>

                <AccountApprovalActions profileId={profile.id} />
              </div>
            ))}

            {pendingApprovalUsers.length === 0 && (
              <div className="p-6 text-sm text-[#5A6B73]">
                No hay solicitudes pendientes.
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <div className="border-b border-[#E2DFD7] p-6">
            <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
              Usuarios
            </h2>
            <p className="mt-2 text-sm text-[#5A6B73]">
              Cambia roles con cuidado. Los tutores reciben una fila en tutors automáticamente.
            </p>
          </div>

          {error && (
            <div className="p-6 text-sm font-medium text-red-700">
              Error cargando usuarios: {error.message}
            </div>
          )}

          <div className="divide-y divide-[#E2DFD7]">
            {users.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-bold">
                    {getProfileDisplayName(profile)}
                  </p>
                  <p className="text-sm text-[#5A6B73]">{profile.email}</p>
                  <p className="mt-1 text-xs font-semibold text-[#5BA8AC]">
                    Rol actual: {profile.role}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {profile.role === "student" && (
                    <a
                      href={`/admin/students/${profile.id}`}
                      className="rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#E0EFEF]"
                    >
                      Editar alumno
                    </a>
                  )}

                  {profile.role === "tutor" && (
                    <a
                      href={`/admin/tutors/${profile.id}`}
                      className="rounded-lg border border-[#E2DFD7] bg-white px-4 py-2 text-sm font-semibold text-[#1C2E36] hover:bg-[#E0EFEF]"
                    >
                      Editar profesor
                    </a>
                  )}

                  {profile.email === "admin@example.com" ? (
                    <span className="rounded-lg bg-[#E0EFEF] px-4 py-2 text-sm font-semibold text-[#1C2E36]">
                      Admin protegido
                    </span>
                  ) : (
                    <AdminRoleActions
                      profileId={profile.id}
                      currentRole={profile.role}
                    />
                  )}
                </div>
              </div>
            ))}

            {users.length === 0 && !error && (
              <div className="p-6 text-sm text-[#5A6B73]">
                No hay usuarios para mostrar.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
