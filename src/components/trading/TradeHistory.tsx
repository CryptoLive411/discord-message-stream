import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ExternalLink, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight,
  History,
} from 'lucide-react';
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
import { useTrades, useDeleteTrade } from '@/hooks/useTrades';
import { StatusBadge } from './StatusBadge';

export function TradeHistory() {
  const { data: trades = [], isLoading } = useTrades(50);
  const deleteTrade = useDeleteTrade();

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Trade History
          </CardTitle>
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
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Trade History
        </CardTitle>
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
                  <th className="text-left py-2 px-2 text-muted-foreground font-medium">TX</th>
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
                    <td className="py-2 px-2">
                      {trade.buy_tx_hash ? (
                        <a 
                          href={`https://solscan.io/tx/${trade.buy_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline font-mono"
                        >
                          {trade.buy_tx_hash.slice(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-muted-foreground text-xs">
                      {new Date(trade.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right">
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
