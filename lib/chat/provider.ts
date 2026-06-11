import { env } from "@/lib/env";
import { buildChatPrompt } from "./build-chat-prompt";
import { generateMockChatResponse } from "./mock-response";
import { callNvidiaNim } from "./providers/nvidia-nim";
import { callOpenAI } from "./providers/openai";
import { callAnthropic } from "./providers/anthropic";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateChatResponseInput {
  studentMessage: string;
  personalizationMarkdown: string;
  tutorEnrichmentMarkdown?: string | null;
  courseContextMarkdown: string;
  conversationHistory?: ConversationMessage[];
}

export async function generateChatResponse(
  input: GenerateChatResponseInput
): Promise<string> {
  const {
    studentMessage,
    personalizationMarkdown,
    tutorEnrichmentMarkdown,
    courseContextMarkdown,
    conversationHistory,
  } = input;

  const { systemPrompt, userPrompt, conversationHistory: history } = buildChatPrompt({
    studentMessage,
    personalizationMarkdown,
    tutorEnrichmentMarkdown,
    courseContextMarkdown,
    conversationHistory,
  });

  switch (env.aiProvider) {
    case "mock":
      // Mock simulates answer behavior only — does NOT echo personalization
      // or skill markdown back to the client. Raw profile data stays server-side.
      return generateMockChatResponse({
        message: userPrompt,
        hasSkill: Boolean(tutorEnrichmentMarkdown),
        hasContext: Boolean(courseContextMarkdown),
        skillPreview: tutorEnrichmentMarkdown?.slice(0, 800) ?? "",
        contextPreview: courseContextMarkdown.slice(0, 1200),
        conversationHistoryLength: history.length,
      });

    case "nvidia-nim":
      return callNvidiaNim({ systemPrompt, userPrompt, conversationHistory: history });

    case "openai":
      return callOpenAI({ systemPrompt, userPrompt, conversationHistory: history });

    case "anthropic":
      return callAnthropic({ systemPrompt, userPrompt, conversationHistory: history });

    default:
      throw new Error(`Unhandled AI_PROVIDER: ${env.aiProvider}`);
  }
}
