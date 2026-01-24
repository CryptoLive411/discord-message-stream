-- Discord channels to track
CREATE TABLE public.discord_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  server_id TEXT NOT NULL,
  server_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  mirror_attachments BOOLEAN NOT NULL DEFAULT true,
  mirror_replies BOOLEAN NOT NULL DEFAULT true,
  telegram_topic_id TEXT,
  telegram_topic_name TEXT,
  last_message_fingerprint TEXT,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Message queue for Telegram sending
CREATE TABLE public.message_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.discord_channels(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  message_text TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT '{}',
  discord_message_id TEXT,
  fingerprint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

-- System logs
CREATE TABLE public.relay_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'success', 'warning', 'error')),
  message TEXT NOT NULL,
  channel_name TEXT,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telegram destination configuration
CREATE TABLE public.telegram_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_type TEXT NOT NULL CHECK (destination_type IN ('channel', 'group')),
  identifier TEXT NOT NULL,
  name TEXT NOT NULL,
  use_topics BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System stats
CREATE TABLE public.system_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_name TEXT NOT NULL UNIQUE,
  stat_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initialize stats
INSERT INTO public.system_stats (stat_name, stat_value) VALUES
  ('messages_forwarded_hour', 0),
  ('messages_forwarded_day', 0),
  ('queue_size', 0),
  ('attachment_failures', 0),
  ('worker_last_ping', 0);

-- Connection status
CREATE TABLE public.connection_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL UNIQUE CHECK (service IN ('discord', 'telegram')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'needs-login', 'needs-auth')),
  last_ping_at TIMESTAMPTZ,
  error_message TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initialize connection status
INSERT INTO public.connection_status (service, status) VALUES
  ('discord', 'disconnected'),
  ('telegram', 'disconnected');

-- Create indexes for performance
CREATE INDEX idx_message_queue_status ON public.message_queue(status);
CREATE INDEX idx_message_queue_created ON public.message_queue(created_at);
CREATE INDEX idx_relay_logs_created ON public.relay_logs(created_at DESC);
CREATE INDEX idx_discord_channels_enabled ON public.discord_channels(enabled);

-- Enable RLS on all tables
ALTER TABLE public.discord_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relay_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_status ENABLE ROW LEVEL SECURITY;

-- Public read policies (for dashboard - no auth required for this MVP)
CREATE POLICY "Allow public read on discord_channels" ON public.discord_channels FOR SELECT USING (true);
CREATE POLICY "Allow public read on message_queue" ON public.message_queue FOR SELECT USING (true);
CREATE POLICY "Allow public read on relay_logs" ON public.relay_logs FOR SELECT USING (true);
CREATE POLICY "Allow public read on telegram_config" ON public.telegram_config FOR SELECT USING (true);
CREATE POLICY "Allow public read on system_stats" ON public.system_stats FOR SELECT USING (true);
CREATE POLICY "Allow public read on connection_status" ON public.connection_status FOR SELECT USING (true);

-- Public write policies (will be secured by API key in edge functions)
CREATE POLICY "Allow public insert on discord_channels" ON public.discord_channels FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on discord_channels" ON public.discord_channels FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on discord_channels" ON public.discord_channels FOR DELETE USING (true);

CREATE POLICY "Allow public insert on message_queue" ON public.message_queue FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on message_queue" ON public.message_queue FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on message_queue" ON public.message_queue FOR DELETE USING (true);

CREATE POLICY "Allow public insert on relay_logs" ON public.relay_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on telegram_config" ON public.telegram_config FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on telegram_config" ON public.telegram_config FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on system_stats" ON public.system_stats FOR UPDATE USING (true);
CREATE POLICY "Allow public update on connection_status" ON public.connection_status FOR UPDATE USING (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_discord_channels_updated_at
  BEFORE UPDATE ON public.discord_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telegram_config_updated_at
  BEFORE UPDATE ON public.telegram_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_stats_updated_at
  BEFORE UPDATE ON public.system_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connection_status_updated_at
  BEFORE UPDATE ON public.connection_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();