import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApprovedApiUser } from "@/lib/auth/require-approved-api-user";

const courseSchema = z.object({
  name: z.string().min(2, "Course name is required"),
});

function normalizeSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  try {

    const approvedUserResult = await requireApprovedApiUser();

    if (approvedUserResult.error) {
      return approvedUserResult.error;
    }

    const body = await request.json();
    const parsed = courseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "unauthorized", message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "forbidden", message: "Only admins can create courses." },
        { status: 403 }
      );
    }

    const admin = createAdminClient();
    const name = parsed.data.name.trim();
    const slug = normalizeSlug(name);

    const { data: course, error } = await admin
      .from("courses")
      .insert({
        name,
        slug,
        created_by: user.id,
      })
      .select("id, name, slug, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "course_create_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("CREATE_COURSE_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected course create error." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("courses")
      .select("id, name, slug, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "courses_fetch_failed", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ courses: data ?? [] });
  } catch (error) {
    console.error("FETCH_COURSES_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected courses fetch error." },
      { status: 500 }
    );
  }
}
