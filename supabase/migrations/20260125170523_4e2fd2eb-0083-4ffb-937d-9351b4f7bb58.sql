-- Create relay_settings table for app configuration
CREATE TABLE public.relay_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relay_settings ENABLE ROW LEVEL SECURITY;

-- Allow public access (no auth required for this admin dashboard)
CREATE POLICY "Allow public read on relay_settings" ON public.relay_settings FOR SELECT USING (true);
CREATE POLICY "Allow public update on relay_settings" ON public.relay_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on relay_settings" ON public.relay_settings FOR INSERT WITH CHECK (true);

-- Insert default settings
INSERT INTO public.relay_settings (setting_key, setting_value) VALUES 
  ('ai_parser_enabled', 'true'),
  ('log_level', '"verbose"');

-- Add more detail columns to relay_logs for better visibility
ALTER TABLE public.relay_logs ADD COLUMN IF NOT EXISTS signal_type text;
ALTER TABLE public.relay_logs ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.relay_logs ADD COLUMN IF NOT EXISTS original_text text;
ALTER TABLE public.relay_logs ADD COLUMN IF NOT EXISTS formatted_text text;
ALTER TABLE public.relay_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';