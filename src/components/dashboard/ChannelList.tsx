import { DiscordChannel } from '@/types';
import { cn } from '@/lib/utils';
import { Hash, Paperclip, MessageSquare, MoreVertical, ExternalLink, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { formatDistanceToNow } from 'date-fns';

interface ChannelListProps {
  channels: DiscordChannel[];
  compact?: boolean;
  onToggleEnabled?: (id: string, enabled: boolean) => void;
  onEditMapping?: (channel: DiscordChannel) => void;
}

export function ChannelList({ channels, compact = false, onToggleEnabled, onEditMapping }: ChannelListProps) {
  const getStatusColor = (status: DiscordChannel['status']) => {
    switch (status) {
      case 'active':
        return 'status-dot-success';
      case 'degraded':
        return 'status-dot-warning';
      case 'error':
        return 'status-dot-error';
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {channels.slice(0, 5).map((channel) => (
          <div
            key={channel.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <span className={cn('status-dot', getStatusColor(channel.status))} />
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium flex-1 truncate">{channel.name}</span>
            {channel.lastMessageAt && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(channel.lastMessageAt, { addSuffix: true })}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {channels.map((channel) => (
        <div
          key={channel.id}
          className={cn(
            'flex items-center gap-4 p-4 rounded-xl glass-card transition-all duration-200 hover:shadow-md',
            !channel.enabled && 'opacity-50'
          )}
        >
          {/* Enable/Disable Toggle */}
          {onToggleEnabled && (
            <Switch
              checked={channel.enabled}
              onCheckedChange={(checked) => onToggleEnabled(channel.id, checked)}
              className="data-[state=checked]:bg-success"
            />
          )}

          <span className={cn('status-dot', getStatusColor(channel.status))} />

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Hash className="w-4 h-4 text-discord flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{channel.name}</p>
              <p className="text-xs text-muted-foreground truncate">{channel.serverName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {channel.mirrorAttachments && (
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            {channel.mirrorReplies && (
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>

          {channel.telegramTopicName && (
            <Badge variant="outline" className="text-telegram border-telegram/30 bg-telegram/10">
              → {channel.telegramTopicName}
            </Badge>
          )}

          <div className="text-right min-w-[80px]">
            <p className="text-sm font-medium">{channel.messageCount.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">messages</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Discord
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onToggleEnabled?.(channel.id, !channel.enabled)}
              >
                <Power className="w-4 h-4 mr-2" />
                {channel.enabled ? 'Disable Tracking' : 'Enable Tracking'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditMapping?.(channel)}>
                Edit Mapping
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
