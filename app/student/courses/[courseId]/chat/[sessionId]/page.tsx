import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApprovedUserOrRedirect } from "@/lib/auth/require-approved-user";
import { getStudentSessionAccessContext } from "@/lib/auth/session-access";
import { ChatBox } from "../chat-box";
import { SessionHeader } from "./session-header";

type PageProps = {
  params: Promise<{
    courseId: string;
    sessionId: string;
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default async function SessionPage({ params }: PageProps) {
  const approvedUser = await getApprovedUserOrRedirect();
  const { courseId, sessionId } = await params;

  const sessionAccess = await getStudentSessionAccessContext({
    user: approvedUser,
    sessionId,
  });

  if (!sessionAccess || sessionAccess.courseId !== courseId) {
    notFound();
  }

  const admin = createAdminClient();

  const { data: messages } = await admin
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const initialMessages: ChatMessage[] = (messages ?? [])
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  return (
    <div className="space-y-6">
      <SessionHeader sessionTitle={sessionAccess.title} />

      <ChatBox
        courseId={courseId}
        sessionId={sessionId}
        initialMessages={initialMessages}
      />
    </div>
  );
}
