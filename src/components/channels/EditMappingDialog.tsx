import { useState } from 'react';
import { DiscordChannel } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { Hash, Loader2 } from 'lucide-react';

interface EditMappingDialogProps {
  channel: DiscordChannel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, topicId: string, topicName: string) => Promise<void>;
  isPending: boolean;
}

export function EditMappingDialog({
  channel,
  open,
  onOpenChange,
  onSave,
  isPending,
}: EditMappingDialogProps) {
  const [topicId, setTopicId] = useState('');
  const [topicName, setTopicName] = useState('');

  // Reset form when channel changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && channel) {
      setTopicId(channel.telegramTopicId || '');
      setTopicName(channel.telegramTopicName || '');
    }
    onOpenChange(newOpen);
  };

  const handleSave = async () => {
    if (!channel) return;
    await onSave(channel.id, topicId.trim(), topicName.trim());
    onOpenChange(false);
  };

  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-discord" />
            Edit Topic Mapping
          </DialogTitle>
          <DialogDescription>
            Change where messages from <strong>#{channel.name}</strong> are sent in Telegram.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current channel info */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium">{channel.name}</p>
            <p className="text-xs text-muted-foreground">{channel.serverName}</p>
          </div>

          {/* Topic ID input */}
          <div className="space-y-2">
            <Label htmlFor="topic-id" className="flex items-center gap-2">
              <TelegramIcon className="w-4 h-4 text-telegram" />
              Telegram Topic ID
            </Label>
            <Input
              id="topic-id"
              placeholder="e.g., 15"
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The numeric ID of the topic/thread in your Telegram group. Leave empty to send to General.
            </p>
          </div>

          {/* Topic Name input */}
          <div className="space-y-2">
            <Label htmlFor="topic-name">Topic Name (for display)</Label>
            <Input
              id="topic-name"
              placeholder="e.g., gem-hunter-wins"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A friendly name shown in the dashboard. Usually matches the topic title.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-telegram hover:bg-telegram/90"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
