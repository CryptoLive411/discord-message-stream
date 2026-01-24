import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ChannelList } from '@/components/dashboard/ChannelList';
import { useChannels, useAddChannel } from '@/hooks/useChannels';
import { useTelegramConfig } from '@/hooks/useTelegramConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, Hash, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Parse Discord channel URL
function parseDiscordUrl(url: string) {
  const match = url.match(/discord\.com\/channels\/(\d+)\/(\d+)/);
  if (!match) return null;
  return { serverId: match[1], channelId: match[2] };
}

export default function Channels() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [channelUrl, setChannelUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [serverName, setServerName] = useState('');
  const [mirrorAttachments, setMirrorAttachments] = useState(true);
  const [mirrorReplies, setMirrorReplies] = useState(true);
  const [topicName, setTopicName] = useState('');

  const { data: channels = [], isLoading: channelsLoading } = useChannels();
  const { data: telegramConfig } = useTelegramConfig();
  const addChannel = useAddChannel();

  const filteredChannels = channels.filter((channel) => {
    const matchesSearch =
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.serverName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      (filterStatus === 'active' && channel.enabled && channel.status === 'active') ||
      (filterStatus === 'disabled' && !channel.enabled) ||
      (filterStatus === 'degraded' && channel.status === 'degraded');
    return matchesSearch && matchesFilter;
  });

  const handleAddChannel = async () => {
    const parsed = parseDiscordUrl(channelUrl);
    if (!parsed) {
      toast.error('Invalid Discord channel URL');
      return;
    }

    if (!channelName.trim()) {
      toast.error('Please enter a channel name');
      return;
    }

    await addChannel.mutateAsync({
      url: channelUrl,
      name: channelName.trim().replace(/^#/, ''),
      serverId: parsed.serverId,
      serverName: serverName.trim() || 'Unknown Server',
      mirrorAttachments,
      mirrorReplies,
      telegramTopicName: topicName.trim() || channelName.trim().replace(/^#/, ''),
    });

    // Reset form
    setChannelUrl('');
    setChannelName('');
    setServerName('');
    setMirrorAttachments(true);
    setMirrorReplies(true);
    setTopicName('');
    setIsAddDialogOpen(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Channel Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure Discord channels to mirror to Telegram
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-discord hover:bg-discord/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Discord Channel</DialogTitle>
                <DialogDescription>
                  Paste the Discord channel URL to start mirroring messages to Telegram.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="channel-url">Discord Channel URL</Label>
                  <Input
                    id="channel-url"
                    placeholder="https://discord.com/channels/..."
                    className="font-mono text-sm"
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Right-click a channel in Discord and select "Copy Link"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel-name">Channel Name</Label>
                    <Input
                      id="channel-name"
                      placeholder="airdrop-hunting"
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="server-name">Server Name</Label>
                    <Input
                      id="server-name"
                      placeholder="Alpha Hunters"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <Label htmlFor="attachments" className="cursor-pointer">
                      Mirror Attachments
                    </Label>
                    <Switch
                      id="attachments"
                      checked={mirrorAttachments}
                      onCheckedChange={setMirrorAttachments}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <Label htmlFor="replies" className="cursor-pointer">
                      Mirror Replies
                    </Label>
                    <Switch
                      id="replies"
                      checked={mirrorReplies}
                      onCheckedChange={setMirrorReplies}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic-name">Telegram Topic Name</Label>
                  <Input
                    id="topic-name"
                    placeholder="Auto-detected from channel name"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-discord hover:bg-discord/90"
                  onClick={handleAddChannel}
                  disabled={addChannel.isPending}
                >
                  {addChannel.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Add Channel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Telegram Destination Info */}
        <div className="glass-card rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-telegram/10">
            <TelegramIcon className="w-6 h-6 text-telegram" />
          </div>
          <div className="flex-1">
            {telegramConfig ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{telegramConfig.name}</p>
                  <Badge variant="outline" className="text-telegram border-telegram/30">
                    {telegramConfig.useTopics ? 'Topics Mode' : 'Single Feed'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{telegramConfig.identifier}</p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground">No Telegram destination configured</p>
                <p className="text-sm text-muted-foreground">Configure in Settings</p>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href="/settings">Change Destination</a>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="degraded">Degraded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Channel Count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hash className="w-4 h-4" />
          <span>
            {filteredChannels.length} channel{filteredChannels.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Channel List */}
        {channelsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Hash className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-foreground mb-2">No channels found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {channels.length === 0
                ? 'Add your first Discord channel to start mirroring messages.'
                : 'No channels match your search or filter.'}
            </p>
            {channels.length === 0 && (
              <Button className="bg-discord hover:bg-discord/90" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Channel
              </Button>
            )}
          </div>
        ) : (
          <ChannelList channels={filteredChannels} />
        )}
      </div>
    </Layout>
  );
}
