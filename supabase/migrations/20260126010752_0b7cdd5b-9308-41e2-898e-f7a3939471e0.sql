-- Add bypass_parser column to discord_channels
ALTER TABLE public.discord_channels 
ADD COLUMN bypass_parser boolean NOT NULL DEFAULT false;

-- Set bypass_parser = true for the channels that should send raw (no AI parsing)
UPDATE public.discord_channels 
SET bypass_parser = true 
WHERE name IN ('memecoin-alpha', 'leverage-alpha', 'gem-alpha', 'market-updates', 'airdrop-hunting');