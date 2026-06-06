import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().max(500).optional().default(""),
});

type RouteProps = {
  params: Promise<{
    requestId: string;
  }>;
};

type RequestType = "student_grade_change" | "tutor_grades_change";

type UpdateRequestRecord = {
  id: string;
  profile_id: string;
  request_type: RequestType;
  requested_value: unknown;
  status: "pending" | "approved" | "rejected";
};

function hasRequestedStudentGrade(
  value: unknown
): value is { grade_id: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "grade_id" in value &&
    typeof value.grade_id === "string"
  );
}

function hasRequestedTutorGrades(
  value: unknown
): value is { grade_ids: string[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "grade_ids" in value &&
    Array.isArray(value.grade_ids) &&
    value.grade_ids.every((gradeId) => typeof gradeId === "string")
  );
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user } = approvedUserResult;

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          error: "forbidden",
          message: "Solo administradores pueden revisar solicitudes.",
        },
        { status: 403 }
      );
    }

    const { requestId } = await params;
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data, error: requestError } = await admin
      .from("profile_update_requests")
      .select("id, profile_id, request_type, requested_value, status")
      .eq("id", requestId)
      .single();

    const updateRequest = data as UpdateRequestRecord | null;

    if (requestError || !updateRequest) {
      return NextResponse.json(
        { error: "request_not_found", message: "Update request not found." },
        { status: 404 }
      );
    }

    if (updateRequest.status !== "pending") {
      return NextResponse.json(
        {
          error: "request_already_reviewed",
          message: "Esta solicitud ya fue revisada.",
        },
        { status: 400 }
      );
    }

    if (parsed.data.action === "approve") {
      if (updateRequest.request_type === "student_grade_change") {
        if (!hasRequestedStudentGrade(updateRequest.requested_value)) {
          return NextResponse.json(
            {
              error: "invalid_requested_value",
              message: "La solicitud no contiene un grado válido.",
            },
            { status: 400 }
          );
        }

        const { error: updateStudentError } = await admin
          .from("students")
          .update({
            grade_id: updateRequest.requested_value.grade_id,
          })
          .eq("profile_id", updateRequest.profile_id);

        if (updateStudentError) {
          return NextResponse.json(
            {
              error: "student_grade_update_failed",
              message: updateStudentError.message,
            },
            { status: 500 }
          );
        }
      }

      if (updateRequest.request_type === "tutor_grades_change") {
        if (!hasRequestedTutorGrades(updateRequest.requested_value)) {
          return NextResponse.json(
            {
              error: "invalid_requested_value",
              message: "La solicitud no contiene grados válidos.",
            },
            { status: 400 }
          );
        }

        const { data: tutor, error: tutorError } = await admin
          .from("tutors")
          .select("id")
          .eq("profile_id", updateRequest.profile_id)
          .single();

        if (tutorError || !tutor) {
          return NextResponse.json(
            { error: "tutor_not_found", message: "Tutor profile not found." },
            { status: 404 }
          );
        }

        const { error: deactivateError } = await admin
          .from("tutor_grades")
          .update({ is_active: false })
          .eq("tutor_id", tutor.id);

        if (deactivateError) {
          return NextResponse.json(
            {
              error: "tutor_grades_deactivate_failed",
              message: deactivateError.message,
            },
            { status: 500 }
          );
        }

        const rows = updateRequest.requested_value.grade_ids.map((gradeId) => ({
          tutor_id: tutor.id,
          grade_id: gradeId,
          is_active: true,
        }));

        const { error: upsertError } = await admin
          .from("tutor_grades")
          .upsert(rows, { onConflict: "tutor_id,grade_id" });

        if (upsertError) {
          return NextResponse.json(
            {
              error: "tutor_grades_update_failed",
              message: upsertError.message,
            },
            { status: 500 }
          );
        }
      }
    }

    const { error: reviewError } = await admin
      .from("profile_update_requests")
      .update({
        status: parsed.data.action === "approve" ? "approved" : "rejected",
        admin_notes: parsed.data.adminNotes.trim() || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      })
      .eq("id", updateRequest.id);

    if (reviewError) {
      return NextResponse.json(
        { error: "request_review_failed", message: reviewError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ADMIN_PROFILE_UPDATE_REQUEST_ERROR", error);

    return NextResponse.json(
      {
        error: "internal_error",
        message: "Unexpected update request review error.",
      },
      { status: 500 }
    );
  }
}
