import { useEffect, useRef, useState } from 'react';
import { LogEntry } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiveLogsProps {
  logs: LogEntry[];
  maxHeight?: string;
  showFilters?: boolean;
}

export function LiveLogs({ logs, maxHeight = '400px', showFilters = false }: LiveLogsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

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

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredLogs = levelFilter 
    ? logs.filter(log => log.level === levelFilter)
    : logs;

  return (
    <div
      ref={containerRef}
      className="bg-sidebar rounded-lg border border-border overflow-hidden scrollbar-thin"
      style={{ maxHeight }}
    >
      <div className="sticky top-0 bg-sidebar/95 backdrop-blur-sm px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="status-dot status-dot-success" />
          <span className="text-xs font-mono text-muted-foreground">Live Logs</span>
          <span className="text-xs text-muted-foreground/60">({filteredLogs.length})</span>
        </div>
        {showFilters && (
          <div className="flex items-center gap-1">
            <Button 
              variant={levelFilter === null ? "secondary" : "ghost"} 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => setLevelFilter(null)}
            >
              All
            </Button>
            <Button 
              variant={levelFilter === 'error' ? "secondary" : "ghost"} 
              size="sm" 
              className="h-6 px-2 text-xs text-red-400"
              onClick={() => setLevelFilter('error')}
            >
              Errors
            </Button>
            <Button 
              variant={levelFilter === 'warning' ? "secondary" : "ghost"} 
              size="sm" 
              className="h-6 px-2 text-xs text-yellow-400"
              onClick={() => setLevelFilter('warning')}
            >
              Warnings
            </Button>
          </div>
        )}
      </div>
      <div className="divide-y divide-border/30">
        {filteredLogs.map((log) => {
          const isExpanded = expandedLogs.has(log.id);
          const hasDetails = log.details || log.channel;
          
          return (
            <div 
              key={log.id} 
              className={cn('log-entry cursor-pointer hover:bg-muted/30 transition-colors', getLogClass(log.level))}
              onClick={() => hasDetails && toggleExpand(log.id)}
            >
              <div className="flex items-start gap-2 w-full">
                {hasDetails && (
                  <span className="text-muted-foreground/40 mt-0.5">
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </span>
                )}
                <span className="text-muted-foreground/60 font-mono text-xs">
                  {format(log.timestamp, 'HH:mm:ss')}
                </span>
                <span className={cn('font-mono text-xs', getLevelColor(log.level))}>
                  {getLevelPrefix(log.level)}
                </span>
                {log.channel && (
                  <span className="text-primary/70 font-mono text-xs">#{log.channel}</span>
                )}
                <span className="flex-1 text-xs">{log.message}</span>
              </div>
              {isExpanded && hasDetails && (
                <div className="mt-2 ml-5 pl-3 border-l border-border/50 text-xs">
                  {log.channel && (
                    <div className="text-muted-foreground">
                      <span className="text-muted-foreground/60">Channel:</span> {log.channel}
                    </div>
                  )}
                  {log.details && (
                    <div className="text-muted-foreground mt-1 font-mono bg-background/50 p-2 rounded">
                      {log.details}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {filteredLogs.length === 0 && (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No logs to display
          </div>
        )}
      </div>
    </div>
  );
}
