import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DiscordIcon } from '@/components/icons/DiscordIcon';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import {
  LayoutDashboard,
  Hash,
  ScrollText,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Hash, label: 'Channels', path: '/channels' },
  { icon: ScrollText, label: 'Logs', path: '/logs' },
  { icon: Activity, label: 'Health', path: '/health' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="relative flex items-center justify-center w-8 h-8">
          <DiscordIcon className="absolute w-5 h-5 text-discord -translate-x-1" />
          <TelegramIcon className="absolute w-5 h-5 text-telegram translate-x-1" />
          <Zap className="absolute w-3 h-3 text-warning bottom-0 right-0" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="font-semibold text-foreground text-sm">Mirror Relay</span>
            <span className="text-xs text-muted-foreground">Discord → Telegram</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                'hover:bg-sidebar-accent',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
              )}
            >
              <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-primary')} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Connection Status */}
      {!collapsed && (
        <div className="px-3 pb-4 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <DiscordIcon className="w-4 h-4 text-discord" />
            <span className="text-xs text-sidebar-foreground/80 flex-1">Discord</span>
            <span className="status-dot status-dot-success" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent/50">
            <TelegramIcon className="w-4 h-4 text-telegram" />
            <span className="text-xs text-sidebar-foreground/80 flex-1">Telegram</span>
            <span className="status-dot status-dot-success" />
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </aside>
  );
}
