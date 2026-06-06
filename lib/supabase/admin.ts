import { createClient } from "@supabase/supabase-js";
import { env, validateEnv } from "@/lib/env";

export function createAdminClient() {
  validateEnv();

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
