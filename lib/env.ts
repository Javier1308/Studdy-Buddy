const requiredEnvVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const KNOWN_PROVIDERS = ["mock", "nvidia-nim", "openai", "anthropic"] as const;
export type AiProvider = (typeof KNOWN_PROVIDERS)[number];

export function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  const provider = process.env.AI_PROVIDER ?? "mock";

  if (!KNOWN_PROVIDERS.includes(provider as AiProvider)) {
    throw new Error(
      `Unknown AI_PROVIDER: "${provider}". Must be one of: ${KNOWN_PROVIDERS.join(", ")}`
    );
  }

  if (provider === "nvidia-nim" && !process.env.NVIDIA_NIM_API_KEY) {
    throw new Error("NVIDIA_NIM_API_KEY is required when AI_PROVIDER=nvidia-nim");
  }

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
  }

  if (
    process.env.AI_PROVIDER === "anthropic" &&
    !process.env.ANTHROPIC_API_KEY
  ) {
    throw new Error("ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic");
  }
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  aiProvider: (process.env.AI_PROVIDER ?? "mock") as AiProvider,
  nvidiaApiKey: process.env.NVIDIA_NIM_API_KEY ?? "",
  nvidiaBaseUrl:
    process.env.NVIDIA_NIM_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  nvidiaModel:
    process.env.NVIDIA_NIM_MODEL ?? "meta/llama-3.3-70b-instruct",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
};
