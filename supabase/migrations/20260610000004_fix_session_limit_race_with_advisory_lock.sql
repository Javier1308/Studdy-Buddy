-- Migration: fix_session_limit_race_with_advisory_lock
--
-- Fixes the max-3 active session limit race condition by adding an advisory lock.
-- Previously: two concurrent requests could both pass the count check and create > 3 sessions.
-- Now: pg_advisory_xact_lock serializes concurrent creates for the same (student_id, course_id) pair.

CREATE OR REPLACE FUNCTION public.create_chat_session_with_limit(
  p_student_id uuid,
  p_course_id  uuid,
  p_title      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_active_count integer;
  v_session_id   uuid;
BEGIN
  -- Serialize concurrent creates for the same (student_id, course_id).
  -- Lock is automatically released at transaction end.
  -- Using hashtext to derive a deterministic bigint key from the (student, course) pair.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_student_id::text || ':' || p_course_id::text)::bigint
  );

  -- Now count active sessions; this count is stable until transaction commits
  SELECT count(*) INTO v_active_count
  FROM public.chat_sessions
  WHERE student_id = p_student_id
    AND course_id  = p_course_id
    AND deleted_at IS NULL;

  -- Enforce max-3 active sessions
  IF v_active_count >= 3 THEN
    RETURN jsonb_build_object('error', 'session_limit_reached');
  END IF;

  -- Insert the new session (safe: no concurrent insert can happen for this (student, course) pair)
  INSERT INTO public.chat_sessions (student_id, course_id, title)
  VALUES (p_student_id, p_course_id, p_title)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id);
END;
$$;
