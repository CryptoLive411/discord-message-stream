-- Add columns to trades table for CA detection
ALTER TABLE trades ADD COLUMN IF NOT EXISTS channel_category TEXT DEFAULT 'other';
ALTER TABLE trades ADD COLUMN IF NOT EXISTS source_author TEXT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS message_preview TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trades_channel_category ON trades(channel_category);
CREATE INDEX IF NOT EXISTS idx_trades_chain ON trades(chain);

-- Add trading configs per category with different allocations
INSERT INTO trading_config (channel_pattern, allocation_sol, stop_loss_pct, take_profit_1_pct, take_profit_2_pct, enabled)
VALUES 
  ('under-100k', 0.05, 25, 50, 100, true),
  ('memecoin-chat', 0.1, 20, 50, 100, true),
  ('memecoin-alpha', 0.15, 15, 75, 150, true),
  ('other', 0.05, 30, 50, 100, true)
ON CONFLICT (channel_pattern) DO NOTHING;