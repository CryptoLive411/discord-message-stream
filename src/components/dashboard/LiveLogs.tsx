import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ChevronDown, ChevronRight, Filter, Zap, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EnhancedLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  channel?: string;
  details?: string;
  signalType?: string;
  authorName?: string;
  originalText?: string;
  formattedText?: string;
}

interface LiveLogsProps {
  logs: EnhancedLogEntry[];
  maxHeight?: string;
  showFilters?: boolean;
}

export function LiveLogs({ logs, maxHeight = '400px', showFilters = true }: LiveLogsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getLogClass = (level: EnhancedLogEntry['level']) => {
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

  const getLevelIcon = (level: EnhancedLogEntry['level']) => {
    switch (level) {
      case 'info':
        return <Info className="w-3 h-3" />;
      case 'success':
        return <CheckCircle className="w-3 h-3" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3" />;
      case 'error':
        return <XCircle className="w-3 h-3" />;
    }
  };

  const getLevelColor = (level: EnhancedLogEntry['level']) => {
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

  const getSignalBadge = (signalType?: string) => {
    if (!signalType) return null;
    
    const badges: Record<string, { label: string; className: string }> = {
      'ca': { label: 'CA', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
      'leverage_trade': { label: 'TRADE', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      'alpha_call': { label: 'ALPHA', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      'skip': { label: 'SKIP', className: 'bg-muted text-muted-foreground border-muted' },
    };

    const badge = badges[signalType] || { label: signalType.toUpperCase(), className: 'bg-muted' };
    
    return (
      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4', badge.className)}>
        {badge.label}
      </Badge>
    );
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

  let filteredLogs = logs;
  if (levelFilter) {
    filteredLogs = filteredLogs.filter(log => log.level === levelFilter);
  }
  if (signalFilter) {
    filteredLogs = filteredLogs.filter(log => log.signalType === signalFilter);
  }

  // Count signal types for filter badges
  const signalCounts = logs.reduce((acc, log) => {
    if (log.signalType) {
      acc[log.signalType] = (acc[log.signalType] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <div
      ref={containerRef}
      className="bg-sidebar rounded-lg border border-border overflow-y-auto scrollbar-thin"
      style={{ maxHeight, overflowY: 'auto' }}
    >
      <div className="sticky top-0 bg-sidebar/95 backdrop-blur-sm border-b border-border z-10">
        <div className="px-3 py-2 flex items-center justify-between">
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
                variant={levelFilter === 'success' ? "secondary" : "ghost"} 
                size="sm" 
                className="h-6 px-2 text-xs text-green-400"
                onClick={() => setLevelFilter('success')}
              >
                Signals
              </Button>
            </div>
          )}
        </div>
        
        {/* Signal type filters */}
        {showFilters && Object.keys(signalCounts).length > 0 && (
          <div className="px-3 pb-2 flex items-center gap-1 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">
              <Filter className="w-3 h-3 inline mr-1" />
              Type:
            </span>
            <Button 
              variant={signalFilter === null ? "secondary" : "ghost"} 
              size="sm" 
              className="h-5 px-2 text-[10px]"
              onClick={() => setSignalFilter(null)}
            >
              All
            </Button>
            {signalCounts['ca'] && (
              <Button 
                variant={signalFilter === 'ca' ? "secondary" : "ghost"} 
                size="sm" 
                className="h-5 px-2 text-[10px] text-purple-400"
                onClick={() => setSignalFilter('ca')}
              >
                CA ({signalCounts['ca']})
              </Button>
            )}
            {signalCounts['leverage_trade'] && (
              <Button 
                variant={signalFilter === 'leverage_trade' ? "secondary" : "ghost"} 
                size="sm" 
                className="h-5 px-2 text-[10px] text-green-400"
                onClick={() => setSignalFilter('leverage_trade')}
              >
                Trades ({signalCounts['leverage_trade']})
              </Button>
            )}
            {signalCounts['skip'] && (
              <Button 
                variant={signalFilter === 'skip' ? "secondary" : "ghost"} 
                size="sm" 
                className="h-5 px-2 text-[10px] text-muted-foreground"
                onClick={() => setSignalFilter('skip')}
              >
                Skipped ({signalCounts['skip']})
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="divide-y divide-border/30">
        {filteredLogs.map((log, index) => {
          const isExpanded = expandedLogs.has(log.id);
          const hasDetails = log.details || log.channel || log.originalText || log.formattedText || log.authorName;
          const uniqueKey = `${log.id}-${index}`;
          
          return (
            <div 
              key={uniqueKey} 
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
                <span className={cn('flex items-center gap-1', getLevelColor(log.level))}>
                  {getLevelIcon(log.level)}
                </span>
                {getSignalBadge(log.signalType)}
                {log.channel && (
                  <span className="text-primary/70 font-mono text-xs">#{log.channel}</span>
                )}
                <span className="flex-1 text-xs truncate">{log.message}</span>
                {log.authorName && (
                  <span className="text-muted-foreground/60 text-xs">by {log.authorName}</span>
                )}
              </div>
              
              {isExpanded && hasDetails && (
                <div className="mt-2 ml-5 pl-3 border-l border-border/50 text-xs space-y-2">
                  {log.authorName && (
                    <div className="text-muted-foreground">
                      <span className="text-muted-foreground/60">Author:</span> {log.authorName}
                    </div>
                  )}
                  {log.channel && (
                    <div className="text-muted-foreground">
                      <span className="text-muted-foreground/60">Channel:</span> #{log.channel}
                    </div>
                  )}
                  {log.signalType && (
                    <div className="text-muted-foreground">
                      <span className="text-muted-foreground/60">Signal Type:</span> {log.signalType}
                    </div>
                  )}
                  {log.originalText && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground/60">Original Message:</span>
                      <div className="font-mono bg-background/50 p-2 rounded text-muted-foreground whitespace-pre-wrap">
                        {log.originalText}
                      </div>
                    </div>
                  )}
                  {log.formattedText && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground/60">Formatted Output:</span>
                      <div className="font-mono bg-green-500/10 border border-green-500/20 p-2 rounded text-foreground whitespace-pre-wrap">
                        {log.formattedText}
                      </div>
                    </div>
                  )}
                  {log.details && !log.originalText && (
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
          <div className="p-8 text-center text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No logs to display</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Logs will appear here when messages are processed</p>
          </div>
        )}
      </div>
    </div>
  );
}
