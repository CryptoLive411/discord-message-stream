-- Create trades table to track all positions
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Token info
  contract_address TEXT NOT NULL,
  token_symbol TEXT,
  chain TEXT NOT NULL DEFAULT 'solana',
  
  -- Source info
  channel_id UUID REFERENCES public.discord_channels(id),
  channel_name TEXT NOT NULL,
  message_fingerprint TEXT,
  author_name TEXT,
  
  -- Trade params
  allocation_sol DECIMAL(10, 4) NOT NULL,
  entry_price DECIMAL(20, 10),
  current_price DECIMAL(20, 10),
  
  -- Exit strategy
  stop_loss_pct DECIMAL(5, 2) NOT NULL DEFAULT -30.00,
  take_profit_1_pct DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
  take_profit_2_pct DECIMAL(5, 2) NOT NULL DEFAULT 200.00,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending_buy',
  -- pending_buy, bought, partial_tp1, sold, stopped_out, failed
  
  buy_tx_hash TEXT,
  sell_tx_hash TEXT,
  sigma_buy_sent_at TIMESTAMP WITH TIME ZONE,
  sigma_sell_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- P&L
  realized_pnl_sol DECIMAL(10, 4),
  
  -- Error tracking
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0
);

-- Create trading_config table for per-channel settings
CREATE TABLE public.trading_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Channel matching (can be exact name or pattern)
  channel_pattern TEXT NOT NULL UNIQUE,
  
  -- Allocation
  allocation_sol DECIMAL(10, 4) NOT NULL DEFAULT 0.25,
  
  -- Exit strategy
  stop_loss_pct DECIMAL(5, 2) NOT NULL DEFAULT -30.00,
  take_profit_1_pct DECIMAL(5, 2) NOT NULL DEFAULT 100.00,
  take_profit_2_pct DECIMAL(5, 2) NOT NULL DEFAULT 200.00,
  
  -- Enabled flag
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Notes
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_config ENABLE ROW LEVEL SECURITY;

-- Public access policies (internal tool - no auth)
CREATE POLICY "Allow public read on trades" ON public.trades FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trades" ON public.trades FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trades" ON public.trades FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on trades" ON public.trades FOR DELETE USING (true);

CREATE POLICY "Allow public read on trading_config" ON public.trading_config FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trading_config" ON public.trading_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on trading_config" ON public.trading_config FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on trading_config" ON public.trading_config FOR DELETE USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trading_config_updated_at
  BEFORE UPDATE ON public.trading_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();