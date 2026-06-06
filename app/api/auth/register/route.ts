import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env, validateEnv } from "@/lib/env";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  try {
    validateEnv();

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password } = parsed.data;

    const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: "signup_failed", message: error.message },
        { status: 400 }
      );
    }

    const userId = data.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "signup_failed", message: "User was not created." },
        { status: 400 }
      );
    }

    const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: studentError } = await admin.from("students").upsert(
      {
        profile_id: userId,
      },
      {
        onConflict: "profile_id",
      }
    );

    if (studentError) {
      return NextResponse.json(
        { error: "student_row_failed", message: studentError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student account created successfully.",
    });
  } catch (error) {
    console.error("REGISTER_ERROR", error);

    return NextResponse.json(
      { error: "internal_error", message: "Unexpected register error." },
      { status: 500 }
    );
  }
}
