-- Add auto-sell strategy fields to trading_config
ALTER TABLE public.trading_config 
ADD COLUMN IF NOT EXISTS auto_sell_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS trailing_stop_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS trailing_stop_pct DECIMAL(5, 2) DEFAULT 15.00,
ADD COLUMN IF NOT EXISTS time_based_sell_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS time_based_sell_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

-- Add auto-sell tracking fields to trades
ALTER TABLE public.trades
ADD COLUMN IF NOT EXISTS auto_sell_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS trailing_stop_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS trailing_stop_pct DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS highest_price DECIMAL(20, 10),
ADD COLUMN IF NOT EXISTS time_based_sell_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_sell_reason TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

-- Insert default trading configs for 3 channels
INSERT INTO public.trading_config (
  channel_pattern, allocation_sol, stop_loss_pct, take_profit_1_pct, take_profit_2_pct,
  auto_sell_enabled, trailing_stop_enabled, trailing_stop_pct, time_based_sell_enabled,
  time_based_sell_minutes, priority, enabled, notes
) VALUES 
  ('memecoin-alpha', 0.5, -25.00, 100.00, 200.00, true, true, 15.00, false, NULL, 'high', true, 'High conviction - larger allocation'),
  ('memecoin-chat', 0.1, -15.00, 50.00, 100.00, true, true, 10.00, true, 30, 'low', true, 'Volatile - small allocation, quick exits'),
  ('under-100k', 0.1, -20.00, 75.00, 150.00, true, true, 12.00, true, 45, 'low', true, 'Microcaps - small allocation')
ON CONFLICT (channel_pattern) DO UPDATE SET
  allocation_sol = EXCLUDED.allocation_sol,
  stop_loss_pct = EXCLUDED.stop_loss_pct,
  take_profit_1_pct = EXCLUDED.take_profit_1_pct,
  take_profit_2_pct = EXCLUDED.take_profit_2_pct,
  auto_sell_enabled = EXCLUDED.auto_sell_enabled,
  trailing_stop_enabled = EXCLUDED.trailing_stop_enabled,
  trailing_stop_pct = EXCLUDED.trailing_stop_pct,
  time_based_sell_enabled = EXCLUDED.time_based_sell_enabled,
  time_based_sell_minutes = EXCLUDED.time_based_sell_minutes,
  priority = EXCLUDED.priority,
  notes = EXCLUDED.notes;