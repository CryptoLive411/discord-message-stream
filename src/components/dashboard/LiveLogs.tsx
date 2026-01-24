import { useEffect, useRef } from 'react';
import { LogEntry } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface LiveLogsProps {
  logs: LogEntry[];
  maxHeight?: string;
}

export function LiveLogs({ logs, maxHeight = '400px' }: LiveLogsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getLogClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'log-entry-info';
      case 'success':
        return 'log-entry-success';
      case 'warning':
        return 'log-entry-warning';
      case 'error':
        return 'log-entry-error';
    }
  };

  const getLevelPrefix = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return '[INFO]';
      case 'success':
        return '[OK]';
      case 'warning':
        return '[WARN]';
      case 'error':
        return '[ERR]';
    }
  };

  return (
    <div
      ref={containerRef}
      className="bg-sidebar rounded-lg border border-border overflow-hidden scrollbar-thin"
      style={{ maxHeight }}
    >
      <div className="sticky top-0 bg-sidebar/95 backdrop-blur-sm px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="status-dot status-dot-success" />
        <span className="text-xs font-mono text-muted-foreground">Live Logs</span>
      </div>
      <div className="divide-y divide-border/30">
        {logs.map((log) => (
          <div key={log.id} className={cn('log-entry', getLogClass(log.level))}>
            <span className="text-muted-foreground/60">
              {format(log.timestamp, 'HH:mm:ss')}
            </span>
            <span className="mx-2">{getLevelPrefix(log.level)}</span>
            <span>{log.message}</span>
            {log.details && (
              <span className="text-muted-foreground/60 ml-2">({log.details})</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
