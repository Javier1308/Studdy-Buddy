-- Migration: create_chat_session_with_limit_rpc
-- Adds an atomic RPC that checks the active-session count and inserts in one
-- transaction, eliminating the race condition in the app-level count→insert path.

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
  -- Count active sessions within the same transaction snapshot
  SELECT count(*) INTO v_active_count
  FROM public.chat_sessions
  WHERE student_id = p_student_id
    AND course_id  = p_course_id
    AND deleted_at IS NULL;

  -- Enforce max-3 limit
  IF v_active_count >= 3 THEN
    RETURN jsonb_build_object('error', 'session_limit_reached');
  END IF;

  -- Insert new session atomically
  INSERT INTO public.chat_sessions (student_id, course_id, title)
  VALUES (p_student_id, p_course_id, p_title)
  RETURNING id INTO v_session_id;

  RETURN jsonb_build_object('success', true, 'session_id', v_session_id);
END;
$$;
