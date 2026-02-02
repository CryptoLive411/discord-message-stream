import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  Loader2,
  Copy,
  Check,
  Shield,
  Clock,
  TrendingDown as TrailingIcon,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Trade, useExecuteSell, useUpdateTrade } from '@/hooks/useTrades';
import { toast } from 'sonner';

interface PositionCardProps {
  trade: Trade;
}

export function PositionCard({ trade }: PositionCardProps) {
  const [sellPercentage, setSellPercentage] = useState(100);
  const [copied, setCopied] = useState(false);
  const executeSell = useExecuteSell();
  const updateTrade = useUpdateTrade();

  // Auto-sell settings from trade
  const autoSellEnabled = (trade as any).auto_sell_enabled ?? true;
  const trailingStopEnabled = (trade as any).trailing_stop_enabled ?? false;
  const highestPrice = (trade as any).highest_price;
  const timeSellAt = (trade as any).time_based_sell_at;

  const handleToggleAutoSell = () => {
    updateTrade.mutate({
      id: trade.id,
      auto_sell_enabled: !autoSellEnabled,
    });
  };

  const handleToggleTrailingStop = () => {
    updateTrade.mutate({
      id: trade.id,
      trailing_stop_enabled: !trailingStopEnabled,
    });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(trade.contract_address);
    setCopied(true);
    toast.success('Contract address copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSell = () => {
    executeSell.mutate({
      tradeId: trade.id,
      contractAddress: trade.contract_address,
      percentage: sellPercentage,
    });
  };

  const isQueued = trade.status === 'pending_sigma';
  const hasTxHash = !!trade.buy_tx_hash;

  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-lg text-foreground">
              {trade.token_symbol || trade.contract_address.slice(0, 6) + '...'}
            </span>
            <StatusBadge status={trade.status} />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </Button>
            <a 
              href={`https://solscan.io/token/${trade.contract_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Contract Address */}
        <code className="block text-xs text-muted-foreground bg-muted/30 px-2 py-1.5 rounded font-mono mb-3 truncate">
          {trade.contract_address}
        </code>

        {/* Trade Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">Entry</span>
            <p className="font-mono font-medium">{trade.allocation_sol} SOL</p>
          </div>
          <div>
            <span className="text-muted-foreground">From</span>
            <p className="font-medium">#{trade.channel_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Stop Loss</span>
            <p className="font-mono text-red-400">{trade.stop_loss_pct}%</p>
          </div>
          <div>
            <span className="text-muted-foreground">Take Profit</span>
            <p className="font-mono text-green-400">+{trade.take_profit_1_pct}%</p>
          </div>
        </div>

        {/* Auto-Sell Controls */}
        {(trade.status === 'bought' || trade.status === 'partial_tp1') && (
          <div className="space-y-2 mb-4 p-2 rounded bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium">Auto-Sell</span>
              </div>
              <Switch
                checked={autoSellEnabled}
                onCheckedChange={handleToggleAutoSell}
                disabled={updateTrade.isPending}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrailingIcon className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-medium">Trailing Stop</span>
              </div>
              <Switch
                checked={trailingStopEnabled}
                onCheckedChange={handleToggleTrailingStop}
                disabled={updateTrade.isPending || !autoSellEnabled}
              />
            </div>

            {highestPrice && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Highest Price</span>
                <span className="font-mono text-green-400">{Number(highestPrice).toExponential(2)}</span>
              </div>
            )}

            {timeSellAt && (
              <div className="flex items-center gap-1 text-xs text-orange-400">
                <Clock className="w-3 h-3" />
                <span>Auto-sell at {new Date(timeSellAt).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}

        {/* TX Hash */}
        {hasTxHash ? (
          <a 
            href={`https://solscan.io/tx/${trade.buy_tx_hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline mb-4"
          >
            <TrendingUp className="w-3 h-3" />
            View Buy TX: {trade.buy_tx_hash?.slice(0, 12)}...
          </a>
        ) : isQueued ? (
          <div className="flex items-center gap-2 text-xs text-yellow-400 mb-4">
            <Loader2 className="w-3 h-3 animate-spin" />
            Waiting for worker to execute...
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mb-4">
            No transaction hash (legacy entry)
          </div>
        )}

        {/* Sell Controls - only show if bought */}
        {trade.status === 'bought' || trade.status === 'partial_tp1' ? (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sell {sellPercentage}%</span>
              <div className="flex gap-1">
                {[25, 50, 75, 100].map((pct) => (
                  <Button
                    key={pct}
                    variant={sellPercentage === pct ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => setSellPercentage(pct)}
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
            </div>
            
            <Slider
              value={[sellPercentage]}
              onValueChange={([value]) => setSellPercentage(value)}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
            
            <Button
              onClick={handleSell}
              disabled={executeSell.isPending || isQueued}
              className="w-full bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              variant="outline"
            >
              {executeSell.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Queuing...
                </>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Sell {sellPercentage}%
                </>
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
