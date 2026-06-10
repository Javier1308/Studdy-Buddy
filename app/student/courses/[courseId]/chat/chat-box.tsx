"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function ChatBox({
  courseId,
  sessionId,
  initialMessages,
}: {
  courseId: string;
  sessionId: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  async function sendMessage() {
    const trimmed = input.trim();

    if (!trimmed || loading) return;

    setLoading(true);
    setError("");
    setInput("");

    setMessages((current) => [
      ...current,
      { role: "user", content: trimmed },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          sessionId,
          message: trimmed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "No se pudo enviar el mensaje.");
        return;
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.assistantMessage },
      ]);
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E2DFD7] bg-white shadow-[0_4px_12px_rgba(46,111,135,.10)]">
      <div className="border-b border-[#E2DFD7] p-6">
        <h2 className="text-2xl font-extrabold tracking-[-0.03em]">
          Chat con Buddy IA
        </h2>
        <p className="mt-2 text-sm text-[#5A6B73]">
          Haz preguntas usando tu perfil personalizado y los materiales confirmados del curso.
        </p>
      </div>

      <div className="max-h-[520px] space-y-4 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="rounded-lg bg-[#F7F5F0] p-4 text-sm text-[#5A6B73]">
            Aún no hay mensajes. Haz tu primera pregunta.
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-[80%] rounded-xl bg-[#2E6F87] p-4 text-sm leading-6 text-white"
                : "mr-auto max-w-[80%] whitespace-pre-wrap rounded-xl bg-[#F7F5F0] p-4 text-sm leading-6 text-[#1C2E36]"
            }
          >
            {message.content}
          </div>
        ))}

        {loading && (
          <div className="mr-auto max-w-[80%] rounded-xl bg-[#F7F5F0] p-4 text-sm font-semibold leading-6 text-[#5A6B73]">
            Buddy está pensando...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[#E2DFD7] p-6">
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <textarea
                  onKeyDown={handleKeyDown}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={loading}
            className="min-h-20 flex-1 rounded-lg border border-[#E2DFD7] bg-[#F7F5F0] px-4 py-3 text-sm outline-none focus:border-[#2E6F87] disabled:opacity-60"
          />

          <button
            type="button"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="self-end rounded-lg bg-[#2E6F87] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1F4E60] disabled:opacity-60"
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
