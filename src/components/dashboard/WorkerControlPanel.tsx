import { Play, Square, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkerStatus, useWorkerCommands, useSendWorkerCommand } from '@/hooks/useWorkerControl';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function WorkerControlPanel() {
  const { data: status, isLoading: statusLoading } = useWorkerStatus();
  const { data: commands = [] } = useWorkerCommands();
  const sendCommand = useSendWorkerCommand();

  const hasPendingCommand = commands.some(c => c.status === 'pending');
  const isRunning = status?.isRunning ?? false;

  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Worker Control</h2>
        <div className="flex items-center gap-2">
          <span className={cn(
            'status-dot',
            isRunning ? 'status-dot-success' : 'status-dot-error'
          )} />
          <span className={cn(
            'text-sm font-medium',
            isRunning ? 'text-success' : 'text-destructive'
          )}>
            {statusLoading ? 'Checking...' : isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {/* Status Info */}
      <div className="p-3 rounded-lg bg-muted/30 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Last heartbeat:</span>
          <span className="font-medium">
            {status?.lastPing 
              ? formatDistanceToNow(status.lastPing, { addSuffix: true })
              : 'Never'
            }
          </span>
        </div>
        {status?.errorMessage && (
          <div className="text-destructive text-xs mt-2">
            Error: {status.errorMessage}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => sendCommand.mutate('start')}
          disabled={sendCommand.isPending || hasPendingCommand || isRunning}
        >
          {sendCommand.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Start
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => sendCommand.mutate('stop')}
          disabled={sendCommand.isPending || hasPendingCommand || !isRunning}
        >
          <Square className="w-4 h-4 mr-2" />
          Stop
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => sendCommand.mutate('restart')}
          disabled={sendCommand.isPending || hasPendingCommand}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Restart
        </Button>
      </div>

      {/* Recent Commands */}
      {commands.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs text-muted-foreground uppercase tracking-wide">Recent Commands</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {commands.slice(0, 5).map((cmd) => (
              <div key={cmd.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20">
                <span className="font-medium">{cmd.command}</span>
                <Badge 
                  variant={cmd.status === 'executed' ? 'default' : cmd.status === 'pending' ? 'secondary' : 'destructive'}
                  className="text-[10px] px-1.5"
                >
                  {cmd.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Commands are queued and executed by the worker when it polls for updates.
      </p>
    </div>
  );
}
