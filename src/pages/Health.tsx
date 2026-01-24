import { Layout } from '@/components/layout/Layout';
import { mockChannels, mockConnectionStatus, mockStats } from '@/data/mockData';
import { DiscordIcon } from '@/components/icons/DiscordIcon';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  HardDrive,
  Clock,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function Health() {
  const getStatusIcon = (status: 'connected' | 'disconnected' | 'needs-login' | 'needs-auth') => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusText = (status: 'connected' | 'disconnected' | 'needs-login' | 'needs-auth') => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'needs-login':
        return 'Needs Login';
      case 'needs-auth':
        return 'Needs Re-auth';
    }
  };

  const channelHealth = {
    active: mockChannels.filter((c) => c.status === 'active').length,
    degraded: mockChannels.filter((c) => c.status === 'degraded').length,
    error: mockChannels.filter((c) => c.status === 'error').length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Health</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor connections, performance, and service status
            </p>
          </div>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>

        {/* Connection Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Discord Connection */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-discord/10">
                <DiscordIcon className="w-6 h-6 text-discord" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Discord Session</h3>
                  {getStatusIcon(mockConnectionStatus.discord)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Browser automation (Playwright)</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        mockConnectionStatus.discord === 'connected'
                          ? 'text-success border-success/30'
                          : 'text-warning border-warning/30'
                      )}
                    >
                      {getStatusText(mockConnectionStatus.discord)}
                    </Badge>
                  </div>
                  {mockConnectionStatus.lastDiscordPing && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Ping</span>
                      <span className="text-foreground">
                        {formatDistanceToNow(mockConnectionStatus.lastDiscordPing, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
                {mockConnectionStatus.discord !== 'connected' && (
                  <Button size="sm" className="mt-4 bg-discord hover:bg-discord/90">
                    Reconnect
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Telegram Connection */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-telegram/10">
                <TelegramIcon className="w-6 h-6 text-telegram" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Telegram Session</h3>
                  {getStatusIcon(mockConnectionStatus.telegram)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">MTProto user session</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        mockConnectionStatus.telegram === 'connected'
                          ? 'text-success border-success/30'
                          : 'text-warning border-warning/30'
                      )}
                    >
                      {getStatusText(mockConnectionStatus.telegram)}
                    </Badge>
                  </div>
                  {mockConnectionStatus.lastTelegramPing && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last Ping</span>
                      <span className="text-foreground">
                        {formatDistanceToNow(mockConnectionStatus.lastTelegramPing, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
                {mockConnectionStatus.telegram !== 'connected' && (
                  <Button size="sm" className="mt-4 bg-telegram hover:bg-telegram/90">
                    Re-authenticate
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Channel Health */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Channel Health</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/30 text-center">
              <p className="text-2xl font-bold text-success">{channelHealth.active}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </div>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 text-center">
              <p className="text-2xl font-bold text-warning">{channelHealth.degraded}</p>
              <p className="text-sm text-muted-foreground">Degraded</p>
            </div>
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-center">
              <p className="text-2xl font-bold text-destructive">{channelHealth.error}</p>
              <p className="text-sm text-muted-foreground">Error</p>
            </div>
          </div>
          <div className="space-y-3">
            {mockChannels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <span
                  className={cn(
                    'status-dot',
                    channel.status === 'active' && 'status-dot-success',
                    channel.status === 'degraded' && 'status-dot-warning',
                    channel.status === 'error' && 'status-dot-error'
                  )}
                />
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium flex-1">{channel.name}</span>
                {channel.lastMessageAt && (
                  <span className="text-xs text-muted-foreground">
                    Last activity:{' '}
                    {formatDistanceToNow(channel.lastMessageAt, { addSuffix: true })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* System Resources (Mock) */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">System Resources</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-muted-foreground" />
                  <span>CPU Usage</span>
                </div>
                <span className="font-medium">12%</span>
              </div>
              <Progress value={12} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-muted-foreground" />
                  <span>Memory</span>
                </div>
                <span className="font-medium">384 MB</span>
              </div>
              <Progress value={38} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-muted-foreground" />
                  <span>Storage</span>
                </div>
                <span className="font-medium">1.2 GB</span>
              </div>
              <Progress value={24} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-muted-foreground" />
                  <span>Queue Capacity</span>
                </div>
                <span className="font-medium">{mockStats.queueSize}/100</span>
              </div>
              <Progress value={mockStats.queueSize} className="h-2" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
