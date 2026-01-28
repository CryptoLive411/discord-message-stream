import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ExternalLink,
  DollarSign,
  Target,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { 
  useTrades, 
  useOpenPositions, 
  useWalletInfo, 
  useExecuteBuy,
  useTradingConfigs,
} from '@/hooks/useTrades';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { OpenPositions } from '@/components/trading/OpenPositions';
import { TradeHistory } from '@/components/trading/TradeHistory';

function WalletCard() {
  const { data: wallet, isLoading, refetch } = useWalletInfo();

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Trading Wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : wallet?.error ? (
          <div className="text-sm text-red-400">
            <p>Failed to load wallet</p>
            <p className="text-xs text-muted-foreground mt-1">{wallet.error}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">
                {wallet?.balanceSol?.toFixed(4)} SOL
              </span>
              <Button variant="ghost" size="icon" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded font-mono truncate max-w-[200px]">
                {wallet?.publicKey?.slice(0, 8)}...{wallet?.publicKey?.slice(-8)}
              </code>
              <a 
                href={`https://solscan.io/account/${wallet?.publicKey}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatsCards() {
  const { data: trades = [] } = useTrades();
  const { data: openPositions = [] } = useOpenPositions();

  const stats = {
    openPositions: openPositions.length,
    totalTrades: trades.length,
    successfulTrades: trades.filter(t => t.status === 'sold').length,
    failedTrades: trades.filter(t => t.status === 'failed').length,
    totalPnl: trades
      .filter(t => t.realized_pnl_sol !== null)
      .reduce((sum, t) => sum + (t.realized_pnl_sol || 0), 0),
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-muted-foreground">Open</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.openPositions}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-sm text-muted-foreground">Wins</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.successfulTrades}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-muted-foreground">Losses</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stats.failedTrades}</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            {stats.totalPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className="text-sm text-muted-foreground">Total P&L</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(4)} SOL
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ManualBuyDialog() {
  const [open, setOpen] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [amountSol, setAmountSol] = useState('0.1');
  const executeBuy = useExecuteBuy();

  const handleBuy = () => {
    if (!contractAddress || !amountSol) return;
    
    executeBuy.mutate(
      { contractAddress, amountSol: parseFloat(amountSol) },
      {
        onSuccess: () => {
          setOpen(false);
          setContractAddress('');
          setAmountSol('0.1');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <TrendingUp className="w-4 h-4" />
          Manual Buy
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Token Buy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Contract Address</label>
            <Input
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="Token mint address..."
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Amount (SOL)</label>
            <Input
              type="number"
              value={amountSol}
              onChange={(e) => setAmountSol(e.target.value)}
              placeholder="0.1"
              step="0.01"
              min="0.001"
              className="mt-1"
            />
          </div>
          <Button 
            onClick={handleBuy} 
            disabled={executeBuy.isPending || !contractAddress}
            className="w-full"
          >
            {executeBuy.isPending ? 'Queuing...' : 'Queue Buy'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Trade will be executed by the worker via Jupiter
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TradingConfigsCard() {
  const { data: configs = [], isLoading } = useTradingConfigs();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Trading Configs</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          Channel Configs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {configs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No trading configs set up</p>
        ) : (
          <div className="space-y-2">
            {configs.map((config) => (
              <div 
                key={config.id}
                className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={config.enabled ? 'default' : 'secondary'}>
                    {config.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                  <span className="font-mono">{config.channel_pattern}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{config.allocation_sol} SOL</span>
                  <span className="text-red-400">{config.stop_loss_pct}% SL</span>
                  <span className="text-green-400">+{config.take_profit_1_pct}% TP1</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Trading() {
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Solana Trading</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Jupiter-powered token trading • Worker executes all trades
            </p>
          </div>
          <ManualBuyDialog />
        </div>

        {/* Wallet & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <WalletCard />
          <div className="lg:col-span-3">
            <StatsCards />
          </div>
        </div>

        {/* Open Positions */}
        <OpenPositions />

        {/* Trading Configs */}
        <TradingConfigsCard />

        {/* Trade History */}
        <TradeHistory />
      </div>
    </Layout>
  );
}
