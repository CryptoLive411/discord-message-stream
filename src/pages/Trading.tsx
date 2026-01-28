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
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { 
  useTrades, 
  useOpenPositions, 
  useWalletInfo, 
  useExecuteSell,
  useExecuteBuy,
  useDeleteTrade,
  useTradingConfigs,
  Trade,
} from '@/hooks/useTrades';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { color: string; icon: React.ReactNode }> = {
    pending_sigma: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Clock className="w-3 h-3" /> },
    bought: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle className="w-3 h-3" /> },
    partial_tp1: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <Target className="w-3 h-3" /> },
    sold: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <DollarSign className="w-3 h-3" /> },
    failed: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
    stopped: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <AlertTriangle className="w-3 h-3" /> },
  };

  const variant = variants[status] || { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: null };

  return (
    <Badge variant="outline" className={`${variant.color} flex items-center gap-1`}>
      {variant.icon}
      {status.replace('_', ' ')}
    </Badge>
  );
}

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

function OpenPositionsTable() {
  const { data: positions = [], isLoading } = useOpenPositions();
  const executeSell = useExecuteSell();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Open Positions ({positions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {positions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No open positions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((trade) => (
              <div 
                key={trade.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-foreground">
                      {trade.token_symbol || trade.contract_address.slice(0, 8) + '...'}
                    </span>
                    <StatusBadge status={trade.status} />
                    <a 
                      href={`https://solscan.io/token/${trade.contract_address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span>Entry: {trade.allocation_sol} SOL</span>
                    <span>From: #{trade.channel_name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
                    onClick={() => executeSell.mutate({
                      tradeId: trade.id,
                      contractAddress: trade.contract_address,
                      percentage: 50,
                    })}
                    disabled={executeSell.isPending}
                  >
                    Sell 50%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-400/30 hover:bg-red-400/10"
                    onClick={() => executeSell.mutate({
                      tradeId: trade.id,
                      contractAddress: trade.contract_address,
                      percentage: 100,
                    })}
                    disabled={executeSell.isPending}
                  >
                    Sell 100%
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TradeHistoryTable() {
  const { data: trades = [], isLoading } = useTrades(50);
  const deleteTrade = useDeleteTrade();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Trade History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Trade History</CardTitle>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No trades yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Token</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Entry</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">P&L</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Channel</th>
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">Time</th>
                  <th className="text-right py-2 px-2 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade) => (
                  <tr key={trade.id} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {trade.token_symbol || trade.contract_address.slice(0, 6) + '...'}
                        </span>
                        <a 
                          href={`https://solscan.io/token/${trade.contract_address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <StatusBadge status={trade.status} />
                    </td>
                    <td className="py-2 px-2 font-mono">
                      {trade.allocation_sol} SOL
                    </td>
                    <td className="py-2 px-2">
                      {trade.realized_pnl_sol !== null ? (
                        <span className={`font-mono flex items-center gap-1 ${
                          trade.realized_pnl_sol >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.realized_pnl_sol >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {trade.realized_pnl_sol >= 0 ? '+' : ''}{trade.realized_pnl_sol.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground">
                      #{trade.channel_name}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground text-xs">
                      {new Date(trade.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {trade.buy_tx_hash && (
                          <a 
                            href={`https://solscan.io/tx/${trade.buy_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-primary hover:text-primary/80"
                            title="View buy TX"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-400">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete trade record?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove the trade from history. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTrade.mutate(trade.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
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
            {executeBuy.isPending ? 'Executing...' : 'Execute Buy'}
          </Button>
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
              Jupiter-powered token trading with auto SL/TP
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
        <OpenPositionsTable />

        {/* Trading Configs */}
        <TradingConfigsCard />

        {/* Trade History */}
        <TradeHistoryTable />
      </div>
    </Layout>
  );
}
