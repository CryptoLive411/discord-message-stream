-- Enable realtime for relay_logs table for live log updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.relay_logs;