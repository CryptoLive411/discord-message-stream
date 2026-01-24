-- Create helper function to increment message count
CREATE OR REPLACE FUNCTION public.increment_message_count(row_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE discord_channels 
  SET message_count = message_count + 1 
  WHERE id = row_id
  RETURNING message_count INTO new_count;
  RETURN new_count;
END;
$$;

-- Create helper function to increment stats
CREATE OR REPLACE FUNCTION public.increment_stat(stat_key text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_value bigint;
BEGIN
  INSERT INTO system_stats (stat_name, stat_value)
  VALUES (stat_key, 1)
  ON CONFLICT (stat_name) DO UPDATE
  SET stat_value = system_stats.stat_value + 1, updated_at = now()
  RETURNING stat_value INTO new_value;
  RETURN new_value;
END;
$$;

-- Add unique constraint on service for connection_status upsert (skip stat_name since it exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'connection_status_service_key') THEN
    ALTER TABLE connection_status ADD CONSTRAINT connection_status_service_key UNIQUE (service);
  END IF;
END $$;

-- Insert initial connection status rows
INSERT INTO connection_status (service, status) VALUES ('discord', 'disconnected') ON CONFLICT DO NOTHING;
INSERT INTO connection_status (service, status) VALUES ('telegram', 'disconnected') ON CONFLICT DO NOTHING;

-- Insert initial stats
INSERT INTO system_stats (stat_name, stat_value) VALUES ('messages_forwarded', 0) ON CONFLICT DO NOTHING;
INSERT INTO system_stats (stat_name, stat_value) VALUES ('active_channels', 0) ON CONFLICT DO NOTHING;