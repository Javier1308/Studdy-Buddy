"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Session = {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export function SessionList({
  courseId,
}: {
  courseId: string;
  studentId?: string;
}) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchSessions() {
      try {
        const response = await fetch(`/api/chat/sessions?courseId=${courseId}`);
        const data = await response.json();
        if (response.ok) {
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, [courseId]);

  const formatTime = (dateString: string | null): string => {
    if (!dateString) return "Sin actividad";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString("es-ES");
  };

  if (loading) {
    return <div className="mt-4 text-sm text-[#5A6B73]">Cargando...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="mt-4 rounded-lg bg-[#F7F5F0] p-3 text-sm text-[#5A6B73]">
        Aún no hay chats. Crea uno para empezar.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {sessions.map((session) => {
        const isActive = pathname.includes(`/chat/${session.id}`);

        return (
          <Link
            key={session.id}
            href={`/student/courses/${courseId}/chat/${session.id}`}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-[#2E6F87] text-white"
                : "text-[#1C2E36] hover:bg-[#F7F5F0]"
            }`}
          >
            <p className="truncate font-semibold">{session.title}</p>
            <p className={`mt-1 truncate text-xs ${isActive ? "text-blue-100" : "text-[#5A6B73]"}`}>
              {session.lastMessagePreview || "Sin mensajes"}
            </p>
            <p className={`mt-1 text-xs ${isActive ? "text-blue-100" : "text-[#5A6B73]"}`}>
              {formatTime(session.lastMessageAt)} · {session.messageCount} msg
            </p>
          </Link>
        );
      })}
    </div>
  );
}
