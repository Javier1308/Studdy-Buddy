import { notFound } from "next/navigation";
import { BackButton } from "@/components/navigation/back-button";
import { createAdminClient } from "@/lib/supabase/admin";
import { StudentEditForm } from "./student-edit-form";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getProfileDisplayName } from "@/lib/profiles/display-name";

type PageProps = {
  params: Promise<{
    profileId: string;
  }>;
};

export default async function AdminStudentDetailPage({ params }: PageProps) {
  await getApprovedUserOrRedirect();
  const { profileId } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, role")
    .eq("id", profileId)
    .single();

  if (!profile || profile.role !== "student") {
    notFound();
  }

  const { data: student } = await admin
    .from("students")
    .select("id, profile_id, grade_id")
    .eq("profile_id", profileId)
    .single();

  if (!student) {
    notFound();
  }

  const [
    { data: grades },
    { data: courses },
    { data: tutorRecords },
    { data: tutorProfiles },
    { data: tutorGrades },
    { data: assignments },
  ] = await Promise.all([
    admin
      .from("grades")
      .select("id, display_name, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    admin.from("courses").select("id, name").is("deleted_at", null).order("name", { ascending: true }),
    admin.from("tutors").select("id, profile_id"),
    admin.from("profiles").select("id, email, role").eq("role", "tutor"),
    admin
      .from("tutor_grades")
      .select("tutor_id, grade_id")
      .eq("is_active", true),
    admin
      .from("student_course_tutors")
      .select("course_id, tutor_id")
      .eq("student_id", student.id)
      .eq("is_active", true),
  ]);

  const tutors = (tutorProfiles ?? [])
    .map((tutorProfile) => {
      const tutorRecord = (tutorRecords ?? []).find(
        (record) => record.profile_id === tutorProfile.id
      );

      if (!tutorRecord) return null;

      return {
        tutorId: tutorRecord.id,
        name: getProfileDisplayName(tutorProfile),
        email: tutorProfile.email,
        gradeIds: (tutorGrades ?? [])
          .filter((row) => row.tutor_id === tutorRecord.id)
          .map((row) => row.grade_id),
      };
    })
    .filter(Boolean) as {
    tutorId: string;
    name: string;
    email: string;
    gradeIds: string[];
  }[];

  return (
    <main className="min-h-screen bg-[#F7F5F0] px-6 py-10 text-[#1C2E36]">
      <section className="mx-auto max-w-5xl">
        <BackButton label="Volver al admin" fallbackHref="/admin/dashboard" />

        <div className="rounded-xl border border-[#E2DFD7] bg-white p-8 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#5BA8AC]">
            Editar alumno
          </p>

          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.04em]">
            {getProfileDisplayName(profile)}
          </h1>

          <p className="mt-3 text-[#5A6B73]">{profile.email}</p>
        </div>

        <StudentEditForm
          studentId={student.id}
          initialGradeId={student.grade_id}
          initialAssignments={(assignments ?? []).map((assignment) => ({
            courseId: assignment.course_id,
            tutorId: assignment.tutor_id,
          }))}
          grades={(grades ?? []) as { id: string; display_name: string }[]}
          courses={(courses ?? []) as { id: string; name: string }[]}
          tutors={tutors}
        />
      </section>
    </main>
  );
}
