"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ChatSession } from "./layout";
import { DeleteSessionDialog } from "./delete-session-dialog";
import { RenameSessionDialog } from "./rename-session-dialog";

type Props = {
  courseId: string;
  sessions: ChatSession[];
};

export function SessionList({ courseId, sessions: initialSessions }: Props) {
  const [sessions, setSessions] = useState<ChatSession[]>(initialSessions);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const pathname = usePathname();

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

  const handleOptimisticDelete = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const handleOptimisticRename = (sessionId: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
    );
  };

  const currentSessionId = deleteTarget || renameTarget;
  const targetSession = currentSessionId
    ? sessions.find((s) => s.id === currentSessionId) ?? null
    : null;

  if (sessions.length === 0) {
    return (
      <div className="mt-4 rounded-lg bg-[#F7F5F0] p-3 text-sm text-[#5A6B73]">
        Aún no hay chats. Crea uno para empezar.
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 space-y-1">
        {sessions.map((session) => {
          const isActive =
            pathname.includes(`/chat/${session.id}`) &&
            !pathname.includes("?");

          return (
            <div
              key={session.id}
              className={`group relative flex items-center rounded-lg transition-colors ${
                isActive ? "bg-[#2E6F87]" : "hover:bg-[#F7F5F0]"
              }`}
            >
              {/* Clickable link area — double-click opens rename modal */}
              <Link
                href={`/student/courses/${courseId}/chat/${session.id}`}
                className="min-w-0 flex-1 px-3 py-2 text-sm"
                onDoubleClick={(e) => {
                  e.preventDefault();
                  setRenameTarget(session.id);
                }}
              >
                <p
                  className={`truncate font-semibold ${
                    isActive ? "text-white" : "text-[#1C2E36]"
                  }`}
                  title="Doble clic para renombrar"
                >
                  {session.title}
                </p>
                <p
                  className={`mt-0.5 truncate text-xs ${
                    isActive ? "text-blue-100" : "text-[#5A6B73]"
                  }`}
                >
                  {session.lastMessagePreview || "Sin mensajes"}
                </p>
                <p
                  className={`mt-0.5 text-xs ${
                    isActive ? "text-blue-100" : "text-[#5A6B73]"
                  }`}
                >
                  {formatTime(session.lastMessageAt)} · {session.messageCount}{" "}
                  msg
                </p>
              </Link>

              {/* X delete button — visible only on row hover */}
              <div className="flex-shrink-0 pr-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteTarget(session.id);
                  }}
                  className={`rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                    isActive
                      ? "text-blue-100 hover:bg-[#1F4E60] hover:text-white"
                      : "text-[#5A6B73] hover:bg-[#E2DFD7] hover:text-[#1C2E36]"
                  }`}
                  aria-label="Eliminar sesión"
                  title="Eliminar sesión"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {deleteTarget && targetSession && (
        <DeleteSessionDialog
          courseId={courseId}
          sessionId={deleteTarget}
          isOpenSession={pathname.includes(`/chat/${deleteTarget}`)}
          onOptimisticDelete={handleOptimisticDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {renameTarget && targetSession && (
        <RenameSessionDialog
          sessionId={renameTarget}
          currentTitle={targetSession.title}
          onOptimisticRename={handleOptimisticRename}
          onClose={() => setRenameTarget(null)}
        />
      )}
    </>
  );
}
