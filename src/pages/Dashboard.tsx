import { Layout } from '@/components/layout/Layout';
import { StatCard } from '@/components/dashboard/StatCard';
import { ChannelList } from '@/components/dashboard/ChannelList';
import { LiveLogs } from '@/components/dashboard/LiveLogs';
import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { mockChannels, mockLogs, mockStats } from '@/data/mockData';
import { MessageSquare, Clock, Layers, AlertTriangle, Hash, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

function formatUptime(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${days}d ${hours}h ${minutes}m`;
}

export default function Dashboard() {
  const activeChannels = mockChannels.filter((c) => c.enabled && c.status === 'active').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time overview of your Discord → Telegram mirror
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="status-dot status-dot-success" />
            <span className="text-sm text-success font-medium">System Online</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={MessageSquare}
            label="Messages (1h)"
            value={mockStats.messagesForwardedHour}
            subValue={`${mockStats.messagesForwardedDay} today`}
            variant="discord"
          />
          <StatCard
            icon={Hash}
            label="Active Channels"
            value={activeChannels}
            subValue={`${mockChannels.length} total`}
            variant="telegram"
          />
          <StatCard
            icon={Layers}
            label="Queue Size"
            value={mockStats.queueSize}
            subValue="messages pending"
            variant="default"
          />
          <StatCard
            icon={Clock}
            label="Uptime"
            value={formatUptime(mockStats.uptime)}
            variant="success"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Chart */}
          <div className="lg:col-span-2 glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Message Activity (24h)</h2>
              <span className="text-xs text-muted-foreground">Auto-refreshes every minute</span>
            </div>
            <ActivityChart />
          </div>

          {/* Quick Stats */}
          <div className="glass-card rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-foreground">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/channels">
                <Button variant="outline" className="w-full justify-between group">
                  <span>Add Channel</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/logs">
                <Button variant="outline" className="w-full justify-between group">
                  <span>View All Logs</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/health">
                <Button variant="outline" className="w-full justify-between group">
                  <span>System Health</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {mockStats.attachmentFailures > 0 && (
              <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-warning">Attachment Failures</p>
                  <p className="text-muted-foreground mt-0.5">
                    {mockStats.attachmentFailures} uploads failed in the last hour
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Channels & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Channels */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Active Channels</h2>
              <Link to="/channels">
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </Link>
            </div>
            <ChannelList channels={mockChannels} compact />
          </div>

          {/* Live Logs */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Recent Activity</h2>
              <Link to="/logs">
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </Link>
            </div>
            <LiveLogs logs={mockLogs} maxHeight="280px" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
