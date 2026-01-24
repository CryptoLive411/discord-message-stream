import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { LiveLogs } from '@/components/dashboard/LiveLogs';
import { useLogs, useRealtimeLogs } from '@/hooks/useLogs';
import { useChannels } from '@/hooks/useChannels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Pause, Play, Download, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function Logs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);

  const { data: initialLogs = [], isLoading: logsLoading } = useLogs(100);
  const { data: channels = [] } = useChannels();
  const logs = useRealtimeLogs(isPaused ? [] : initialLogs);

  // Use initial logs when paused, realtime logs otherwise
  const displayLogs = isPaused ? initialLogs : logs;

  const filteredLogs = displayLogs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesChannel =
      filterChannel === 'all' || (log.channel && log.channel === filterChannel);
    return matchesSearch && matchesLevel && matchesChannel;
  });

  const logCounts = {
    total: displayLogs.length,
    info: displayLogs.filter((l) => l.level === 'info').length,
    success: displayLogs.filter((l) => l.level === 'success').length,
    warning: displayLogs.filter((l) => l.level === 'warning').length,
    error: displayLogs.filter((l) => l.level === 'error').length,
  };

  const handleExport = () => {
    const logText = filteredLogs
      .map((log) => `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relay-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time activity logs and event history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isPaused ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-foreground">
            {logCounts.total} Total
          </Badge>
          <Badge variant="outline" className="text-success border-success/30">
            {logCounts.success} Success
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            {logCounts.info} Info
          </Badge>
          <Badge variant="outline" className="text-warning border-warning/30">
            {logCounts.warning} Warnings
          </Badge>
          <Badge variant="outline" className="text-destructive border-destructive/30">
            {logCounts.error} Errors
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-mono text-sm"
            />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterChannel} onValueChange={setFilterChannel}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.name}>
                  #{channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Live indicator */}
        {!isPaused && (
          <div className="flex items-center gap-2 text-sm">
            <span className="status-dot status-dot-success" />
            <span className="text-muted-foreground">Live - Auto-refreshing</span>
          </div>
        )}

        {/* Logs */}
        {logsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground">
              {displayLogs.length === 0 
                ? 'No logs yet. Activity will appear here when the worker starts processing messages.'
                : 'No logs match your search or filter.'}
            </p>
          </div>
        ) : (
          <LiveLogs logs={filteredLogs} maxHeight="calc(100vh - 340px)" />
        )}
      </div>
    </Layout>
  );
}
