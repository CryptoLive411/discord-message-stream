import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ChannelList } from '@/components/dashboard/ChannelList';
import { mockChannels, mockTelegramDestination } from '@/data/mockData';
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
import { Plus, Search, Filter, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TelegramIcon } from '@/components/icons/TelegramIcon';

export default function Channels() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredChannels = mockChannels.filter((channel) => {
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
                  />
                  <p className="text-xs text-muted-foreground">
                    Right-click a channel in Discord and select "Copy Link"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <Label htmlFor="attachments" className="cursor-pointer">
                      Mirror Attachments
                    </Label>
                    <Switch id="attachments" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <Label htmlFor="replies" className="cursor-pointer">
                      Mirror Replies
                    </Label>
                    <Switch id="replies" defaultChecked />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Telegram Destination</Label>
                  <Select defaultValue="topic">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Feed (All Messages)</SelectItem>
                      <SelectItem value="topic">Create Topic (Recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic-name">Topic Name</Label>
                  <Input id="topic-name" placeholder="Auto-detected from channel name" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button className="bg-discord hover:bg-discord/90">
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
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">{mockTelegramDestination.name}</p>
              <Badge variant="outline" className="text-telegram border-telegram/30">
                {mockTelegramDestination.useTopics ? 'Topics Mode' : 'Single Feed'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{mockTelegramDestination.identifier}</p>
          </div>
          <Button variant="outline" size="sm">
            Change Destination
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
        <ChannelList channels={filteredChannels} />
      </div>
    </Layout>
  );
}
