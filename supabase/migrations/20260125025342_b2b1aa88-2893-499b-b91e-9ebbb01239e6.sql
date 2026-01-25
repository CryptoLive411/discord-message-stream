-- Create a table for global tracked authors whitelist
CREATE TABLE public.tracked_authors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tracked_authors ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (matching other tables in this project)
CREATE POLICY "Allow public read on tracked_authors"
  ON public.tracked_authors FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on tracked_authors"
  ON public.tracked_authors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on tracked_authors"
  ON public.tracked_authors FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on tracked_authors"
  ON public.tracked_authors FOR DELETE
  USING (true);