export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string; // bearer token — NEVER logged
  model: string;
  timeoutMs?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatPrompt {
  systemPrompt: string;
  userPrompt: string;
  conversationHistory?: ChatMessage[];
}

export async function callOpenAICompatible(
  config: OpenAICompatibleConfig,
  prompt: ChatPrompt
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.timeoutMs ?? 30_000
  );

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: prompt.systemPrompt },
          ...(prompt.conversationHistory ?? []),
          { role: "user", content: prompt.userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Provider returned HTTP ${response.status}`);
      // NOTE: do NOT include response.body in the error — it may contain sensitive metadata
    }

    const data = await response.json();
    const content: string | null | undefined =
      data?.choices?.[0]?.message?.content;
    const trimmed = content?.trim();

    if (!trimmed) {
      throw new Error("Provider returned empty content");
    }

    return trimmed;
  } finally {
    clearTimeout(timeoutId);
  }
}
