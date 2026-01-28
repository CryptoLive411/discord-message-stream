import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Inbox } from 'lucide-react';
import { useOpenPositions } from '@/hooks/useTrades';
import { PositionCard } from './PositionCard';

export function OpenPositions() {
  const { data: positions = [], isLoading } = useOpenPositions();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Open Positions
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Target className="w-5 h-5 text-primary" />
        Open Positions ({positions.length})
      </h2>
      
      {positions.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No open positions</p>
              <p className="text-sm mt-1">Use "Manual Buy" to open a new position</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {positions.map((trade) => (
            <PositionCard key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </div>
  );
}
