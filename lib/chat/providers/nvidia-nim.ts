import { env } from "@/lib/env";
import { callOpenAICompatible, type ChatPrompt } from "./openai-compatible";

export async function callNvidiaNim(prompt: ChatPrompt): Promise<string> {
  return callOpenAICompatible(
    {
      baseUrl: env.nvidiaBaseUrl,
      apiKey: env.nvidiaApiKey,
      model: env.nvidiaModel,
    },
    prompt
  );
}
