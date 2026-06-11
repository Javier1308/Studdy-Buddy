import type { ChatPrompt } from "./openai-compatible";

export async function callOpenAI(_prompt: ChatPrompt): Promise<string> {
  throw new Error("OpenAI provider is not yet implemented.");
}
