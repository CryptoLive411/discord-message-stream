-- Add channel_category and chain columns to trades table for categorized trading
-- Categories: under-100k, memecoin-chat, memecoin-alpha, other

-- Add channel_category column
ALTER TABLE trades ADD COLUMN IF NOT EXISTS channel_category TEXT DEFAULT 'other';

-- Add chain column (solana or base)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS chain TEXT DEFAULT 'solana';

-- Add source_author column
ALTER TABLE trades ADD COLUMN IF NOT EXISTS source_author TEXT;

-- Add message_preview column
ALTER TABLE trades ADD COLUMN IF NOT EXISTS message_preview TEXT;

-- Create index for faster queries by category
CREATE INDEX IF NOT EXISTS idx_trades_channel_category ON trades(channel_category);
CREATE INDEX IF NOT EXISTS idx_trades_chain ON trades(chain);

-- Insert default trading configs for each category
INSERT INTO trading_config (channel_pattern, allocation_sol, stop_loss_pct, take_profit_1_pct, take_profit_2_pct, enabled)
VALUES 
  ('under-100k', 0.05, 25, 50, 100, true),
  ('memecoin-chat', 0.1, 20, 50, 100, true),
  ('memecoin-alpha', 0.15, 15, 75, 150, true),
  ('other', 0.05, 30, 50, 100, true)
ON CONFLICT (channel_pattern) DO UPDATE SET
  allocation_sol = EXCLUDED.allocation_sol,
  stop_loss_pct = EXCLUDED.stop_loss_pct,
  take_profit_1_pct = EXCLUDED.take_profit_1_pct,
  take_profit_2_pct = EXCLUDED.take_profit_2_pct;
