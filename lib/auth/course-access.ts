import { createAdminClient } from "@/lib/supabase/admin";

type ApprovedUser = {
  id: string;
  role: "admin" | "student" | "tutor";
};

type CourseAccessInput = {
  user: ApprovedUser;
  courseId: string;
};

type StudentCourseAccessInput = {
  user: ApprovedUser;
  studentId: string;
  courseId?: string;
};

export type StudentCourseAccessContext = {
  studentId: string;
  courseId: string;
  assignmentId: string;
  tutorId: string | null;
};

export async function getStudentCourseAccessContext({
  user,
  courseId,
}: CourseAccessInput): Promise<StudentCourseAccessContext | null> {
  if (user.role !== "student") {
    return null;
  }

  const admin = createAdminClient();

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!student) {
    return null;
  }

  const { data: assignment } = await admin
    .from("student_course_tutors")
    .select("id, tutor_id")
    .eq("student_id", student.id)
    .eq("course_id", courseId)
    .eq("is_active", true)
    .maybeSingle();

  if (!assignment) {
    return null;
  }

  return {
    studentId: student.id,
    courseId,
    assignmentId: assignment.id,
    tutorId: assignment.tutor_id ?? null,
  };
}

export async function canAccessCourse({ user, courseId }: CourseAccessInput) {
  if (user.role === "admin") {
    return true;
  }

  const admin = createAdminClient();

  if (user.role === "student") {
    const context = await getStudentCourseAccessContext({ user, courseId });

    return Boolean(context);
  }

  if (user.role === "tutor") {
    const { data: tutor } = await admin
      .from("tutors")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!tutor) {
      return false;
    }

    const { data: assignment } = await admin
      .from("student_course_tutors")
      .select("id")
      .eq("tutor_id", tutor.id)
      .eq("course_id", courseId)
      .eq("is_active", true)
      .maybeSingle();

    return Boolean(assignment);
  }

  return false;
}

export async function canAccessStudentCourse({
  user,
  studentId,
  courseId,
}: StudentCourseAccessInput) {
  if (user.role === "admin") {
    return true;
  }

  const admin = createAdminClient();

  if (user.role === "student") {
    const { data: student } = await admin
      .from("students")
      .select("id")
      .eq("profile_id", user.id)
      .eq("id", studentId)
      .maybeSingle();

    if (!student) {
      return false;
    }

    if (!courseId) {
      return true;
    }

    const { data: assignment } = await admin
      .from("student_course_tutors")
      .select("id")
      .eq("student_id", student.id)
      .eq("course_id", courseId)
      .eq("is_active", true)
      .maybeSingle();

    return Boolean(assignment);
  }

  if (user.role === "tutor") {
    const { data: tutor } = await admin
      .from("tutors")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (!tutor) {
      return false;
    }

    let query = admin
      .from("student_course_tutors")
      .select("id")
      .eq("tutor_id", tutor.id)
      .eq("student_id", studentId)
      .eq("is_active", true);

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    const { data: assignment } = await query.maybeSingle();

    return Boolean(assignment);
  }

  return false;
}


export type StudentFileAccessContext = {
  fileId: string;
  studentId: string;
  courseId: string;
  originalFilename: string | null;
  fileType: string | null;
  storagePathOriginal: string | null;
  storagePathExtracted: string | null;
  extractionStatus: string | null;
};

export async function getStudentFileAccessContext({
  user,
  fileId,
}: {
  user: ApprovedUser;
  fileId: string;
}): Promise<StudentFileAccessContext | null> {
  if (user.role !== "student") {
    return null;
  }

  const admin = createAdminClient();

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!student) {
    return null;
  }

  const { data: file } = await admin
    .from("uploaded_files")
    .select(
      "id, student_id, course_id, original_filename, file_type, storage_path_original, storage_path_extracted, extraction_status, deleted_at"
    )
    .eq("id", fileId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (!file || file.deleted_at) {
    return null;
  }

  const { data: assignment } = await admin
    .from("student_course_tutors")
    .select("id")
    .eq("student_id", student.id)
    .eq("course_id", file.course_id)
    .eq("is_active", true)
    .maybeSingle();

  if (!assignment) {
    return null;
  }

  return {
    fileId: file.id,
    studentId: student.id,
    courseId: file.course_id,
    originalFilename: file.original_filename ?? null,
    fileType: file.file_type ?? null,
    storagePathOriginal: file.storage_path_original ?? null,
    storagePathExtracted: file.storage_path_extracted ?? null,
    extractionStatus: file.extraction_status ?? null,
  };
}
