-- Migration: add_message_count_trigger
-- Keeps chat_sessions.message_count in sync with chat_messages inserts/deletes

CREATE OR REPLACE FUNCTION public.sync_session_message_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chat_sessions
      SET message_count = message_count + 1
      WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.chat_sessions
      SET message_count = GREATEST(message_count - 1, 0)
      WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_message_count_sync ON public.chat_messages;
CREATE TRIGGER on_chat_message_count_sync
  AFTER INSERT OR DELETE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_session_message_count();
