-- Update check constraint to allow 'worker' service
ALTER TABLE public.connection_status DROP CONSTRAINT connection_status_service_check;
ALTER TABLE public.connection_status ADD CONSTRAINT connection_status_service_check 
  CHECK (service = ANY (ARRAY['discord'::text, 'telegram'::text, 'worker'::text]));

-- Now add the worker status row
INSERT INTO public.connection_status (service, status, last_ping_at)
VALUES ('worker', 'disconnected', NULL);