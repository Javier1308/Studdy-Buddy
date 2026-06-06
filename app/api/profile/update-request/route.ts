import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const createRequestSchema = z.discriminatedUnion("requestType", [
  z.object({
    requestType: z.literal("student_grade_change"),
    requestedGradeId: z.string().uuid(),
  }),
  z.object({
    requestType: z.literal("tutor_grades_change"),
    requestedGradeIds: z.array(z.string().uuid()).min(1),
  }),
]);

type CurrentValue =
  | {
      grade_id: string | null;
    }
  | {
      grade_ids: string[];
    };

type RequestedValue =
  | {
      grade_id: string;
    }
  | {
      grade_ids: string[];
    };

export async function POST(request: Request) {
  try {
    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const { user } = approvedUserResult;
    const body = await request.json();
    const parsed = createRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existingPending } = await admin
      .from("profile_update_requests")
      .select("id")
      .eq("profile_id", user.id)
      .eq("request_type", parsed.data.requestType)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending) {
      return NextResponse.json(
        {
          error: "pending_request_exists",
          message: "Ya tienes una solicitud pendiente de este tipo.",
        },
        { status: 409 }
      );
    }

    let currentValue: CurrentValue;
    let requestedValue: RequestedValue;

    if (parsed.data.requestType === "student_grade_change") {
      if (user.role !== "student") {
        return NextResponse.json(
          {
            error: "forbidden",
            message: "Solo estudiantes pueden solicitar cambio de grado.",
          },
          { status: 403 }
        );
      }

      const { data: student, error: studentError } = await admin
        .from("students")
        .select("grade_id")
        .eq("profile_id", user.id)
        .single();

      if (studentError || !student) {
        return NextResponse.json(
          { error: "student_not_found", message: "Student profile not found." },
          { status: 404 }
        );
      }

      if (student.grade_id === parsed.data.requestedGradeId) {
        return NextResponse.json(
          {
            error: "same_grade",
            message: "El grado solicitado es igual al grado actual.",
          },
          { status: 400 }
        );
      }

      currentValue = {
        grade_id: student.grade_id ?? null,
      };

      requestedValue = {
        grade_id: parsed.data.requestedGradeId,
      };
    } else {
      if (user.role !== "tutor") {
        return NextResponse.json(
          {
            error: "forbidden",
            message: "Solo tutores pueden solicitar cambio de grados que enseñan.",
          },
          { status: 403 }
        );
      }

      const { data: tutor, error: tutorError } = await admin
        .from("tutors")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (tutorError || !tutor) {
        return NextResponse.json(
          { error: "tutor_not_found", message: "Tutor profile not found." },
          { status: 404 }
        );
      }

      const { data: currentGrades } = await admin
        .from("tutor_grades")
        .select("grade_id")
        .eq("tutor_id", tutor.id)
        .eq("is_active", true);

      const currentGradeIds = (currentGrades ?? [])
        .map((row) => row.grade_id)
        .filter((gradeId): gradeId is string => Boolean(gradeId))
        .sort();

      const requestedGradeIds = [...new Set(parsed.data.requestedGradeIds)].sort();

      if (currentGradeIds.join(",") === requestedGradeIds.join(",")) {
        return NextResponse.json(
          {
            error: "same_grades",
            message: "Los grados solicitados son iguales a los actuales.",
          },
          { status: 400 }
        );
      }

      currentValue = {
        grade_ids: currentGradeIds,
      };

      requestedValue = {
        grade_ids: requestedGradeIds,
      };
    }

    const { error: insertError } = await admin
      .from("profile_update_requests")
      .insert({
        profile_id: user.id,
        request_type: parsed.data.requestType,
        current_value: currentValue,
        requested_value: requestedValue,
        status: "pending",
      });

    if (insertError) {
      return NextResponse.json(
        { error: "request_create_failed", message: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PROFILE_UPDATE_REQUEST_ERROR", error);

    return NextResponse.json(
      {
        error: "internal_error",
        message: "Unexpected profile update request error.",
      },
      { status: 500 }
    );
  }
}
