-- Patch: prevent duplicate notifications

CREATE UNIQUE INDEX IF NOT EXISTS notifications_unique
  ON notifications (user_id, event_id, channel, scheduled_at);
