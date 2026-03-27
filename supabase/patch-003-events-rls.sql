-- Patch: enable RLS on events to prevent direct client access

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
