-- ============================================================
-- HANDO — Optional: Chat / Inbox tables
-- Run this ONLY if you want to enable the inbox/chat feature.
-- These tables are additive — existing data is unaffected.
-- ============================================================

-- Conversations: one per job×applicant pair, created when employer accepts
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  participant_a UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- poster
  participant_b UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, -- worker
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, participant_a, participant_b)
);

-- Messages within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 4000),
  is_read          BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS conversations_participant_a_idx ON conversations(participant_a);
CREATE INDEX IF NOT EXISTS conversations_participant_b_idx ON conversations(participant_b);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages(conversation_id, created_at);

-- RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Participants can only see their own conversations
CREATE POLICY "conversation_participants" ON conversations
  FOR ALL USING (participant_a = auth.uid() OR participant_b = auth.uid());

-- Participants can see messages in their conversations
CREATE POLICY "message_readers" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_id
      AND (participant_a = auth.uid() OR participant_b = auth.uid())
    )
  );

-- Only sender can insert
CREATE POLICY "message_sender" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- ============================================================
-- Function: auto-create conversation when application accepted
-- Hook this into your accept_application RPC or trigger.
-- ============================================================
CREATE OR REPLACE FUNCTION create_conversation_on_accept()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act on status change to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO conversations (job_id, participant_a, participant_b)
    SELECT
      NEW.job_id,
      j.poster_id,  -- poster is participant_a
      NEW.worker_id -- worker is participant_b
    FROM jobs j
    WHERE j.id = NEW.job_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_application_accepted
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION create_conversation_on_accept();

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
