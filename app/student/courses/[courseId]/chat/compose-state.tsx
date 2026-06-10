import { ChatBox } from "./chat-box";

type Props = {
  courseId: string;
};

export function ComposeState({ courseId }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E2DFD7] bg-white p-6 shadow-[0_4px_12px_rgba(46,111,135,.10)]">
        <h1 className="text-2xl font-extrabold tracking-[-0.03em] text-[#1C2E36]">
          Nuevo chat
        </h1>
        <p className="mt-1 text-sm text-[#5A6B73]">
          Haz tu primera pregunta para empezar.
        </p>
      </div>

      <ChatBox courseId={courseId} initialMessages={[]} />
    </div>
  );
}
