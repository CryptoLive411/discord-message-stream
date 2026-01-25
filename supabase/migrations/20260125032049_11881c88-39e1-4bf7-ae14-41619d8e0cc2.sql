-- Create banned_authors table for blacklisting Discord users
CREATE TABLE public.banned_authors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS with public access (same pattern as tracked_authors)
ALTER TABLE public.banned_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on banned_authors" ON public.banned_authors FOR SELECT USING (true);
CREATE POLICY "Allow public insert on banned_authors" ON public.banned_authors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on banned_authors" ON public.banned_authors FOR DELETE USING (true);
CREATE POLICY "Allow public update on banned_authors" ON public.banned_authors FOR UPDATE USING (true);