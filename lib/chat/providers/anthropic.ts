import type { ChatPrompt } from "./openai-compatible";

export async function callAnthropic(_prompt: ChatPrompt): Promise<string> {
  throw new Error("Anthropic provider is not yet implemented.");
}
