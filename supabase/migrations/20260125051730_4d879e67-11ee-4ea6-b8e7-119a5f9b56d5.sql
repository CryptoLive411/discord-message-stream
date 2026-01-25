-- Create worker_commands table for remote control
CREATE TABLE public.worker_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  command TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.worker_commands ENABLE ROW LEVEL SECURITY;

-- Allow public access (worker needs to read/update)
CREATE POLICY "Allow public read on worker_commands" 
ON public.worker_commands FOR SELECT USING (true);

CREATE POLICY "Allow public insert on worker_commands" 
ON public.worker_commands FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on worker_commands" 
ON public.worker_commands FOR UPDATE USING (true);