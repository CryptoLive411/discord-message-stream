-- Create sell_requests table for worker-based sell execution
CREATE TABLE public.sell_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  percentage INTEGER NOT NULL DEFAULT 100,
  slippage_bps INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT,
  error_message TEXT,
  realized_sol NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Index for quick lookup of pending sell requests
CREATE INDEX idx_sell_requests_status ON public.sell_requests(status) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.sell_requests ENABLE ROW LEVEL SECURITY;

-- Allow public access (internal tool, protected by worker API key)
CREATE POLICY "Allow public read on sell_requests" 
ON public.sell_requests FOR SELECT USING (true);

CREATE POLICY "Allow public insert on sell_requests" 
ON public.sell_requests FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on sell_requests" 
ON public.sell_requests FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on sell_requests" 
ON public.sell_requests FOR DELETE USING (true);