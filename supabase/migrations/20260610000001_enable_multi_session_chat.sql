-- Migration: enable_multi_session_chat
-- Adds soft-delete and message count for chat session management

BEGIN;

-- Add soft-delete column
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add denormalized message count
ALTER TABLE public.chat_sessions
  ADD COLUMN IF NOT EXISTS message_count integer NOT NULL DEFAULT 0;

-- Backfill message counts (safe: 1 session, 18 messages)
UPDATE public.chat_sessions s
SET message_count = (
  SELECT count(*) FROM public.chat_messages m WHERE m.session_id = s.id
);

-- Drop the single-session constraint (enables multi-session)
ALTER TABLE public.chat_sessions
  DROP CONSTRAINT IF EXISTS chat_sessions_student_course_unique;

-- Index for active-session lists ordered by recency
CREATE INDEX IF NOT EXISTS idx_sessions_active_recent
  ON public.chat_sessions (student_id, course_id, last_message_at DESC)
  WHERE deleted_at IS NULL;

-- Update RLS policy to exclude soft-deleted sessions
DROP POLICY IF EXISTS "sessions: student reads own" ON public.chat_sessions;
CREATE POLICY "sessions: student reads own"
  ON public.chat_sessions
  FOR SELECT
  USING (student_id = get_my_student_id() AND deleted_at IS NULL);

-- Verify/patch chat_messages RLS to exclude soft-deleted sessions
DROP POLICY IF EXISTS "messages: student reads own sessions" ON public.chat_messages;
CREATE POLICY "messages: student reads own sessions"
  ON public.chat_messages
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions
      WHERE student_id = get_my_student_id() AND deleted_at IS NULL
    )
  );

COMMIT;
