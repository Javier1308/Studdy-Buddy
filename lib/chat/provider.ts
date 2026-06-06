import { generateMockChatResponse } from "./mock-response";

export async function generateChatResponse({
  studentMessage,
  skillMarkdown,
  courseContextMarkdown,
}: {
  studentMessage: string;
  skillMarkdown: string;
  courseContextMarkdown: string;
}) {
  const provider = process.env.AI_PROVIDER ?? "mock";

  if (provider === "mock") {
    return generateMockChatResponse({
      message: studentMessage,
      hasSkill: Boolean(skillMarkdown),
      hasContext: Boolean(courseContextMarkdown),
      skillPreview: skillMarkdown.slice(0, 800),
      contextPreview: courseContextMarkdown.slice(0, 1200),
    });
  }

  throw new Error(`Unsupported AI_PROVIDER: ${provider}`);
}
