import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DiscordIcon } from '@/components/icons/DiscordIcon';
import { TelegramIcon } from '@/components/icons/TelegramIcon';
import { TrackedAuthorsSection } from '@/components/settings/TrackedAuthorsSection';
import { BannedAuthorsSection } from '@/components/settings/BannedAuthorsSection';
import { Save, Key, RefreshCw, Shield, Clock, Zap } from 'lucide-react';
import { useState } from 'react';

export default function Settings() {
  const [pollInterval, setPollInterval] = useState([3]);
  const [rateLimit, setRateLimit] = useState([1]);

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure your Discord → Telegram mirror relay
            </p>
          </div>
          <Button>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>

        {/* Discord Settings */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-discord/10">
              <DiscordIcon className="w-5 h-5 text-discord" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Discord Connection</h2>
              <p className="text-sm text-muted-foreground">Browser session settings</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Browser Profile</Label>
              <Select defaultValue="chrome">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chrome">Chrome (Recommended)</SelectItem>
                  <SelectItem value="firefox">Firefox</SelectItem>
                  <SelectItem value="edge">Edge</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Uses your existing browser profile to maintain Discord session
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Poll Interval</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {pollInterval[0]}s per channel
                </span>
              </div>
              <Slider
                value={pollInterval}
                onValueChange={setPollInterval}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                How often to check each channel for new messages. Lower = faster but more CPU.
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label>Headless Mode</Label>
                <p className="text-xs text-muted-foreground">Run browser without visible window</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Telegram Settings */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-telegram/10">
              <TelegramIcon className="w-5 h-5 text-telegram" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Telegram Connection</h2>
              <p className="text-sm text-muted-foreground">MTProto user session settings</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api-id">API ID</Label>
                <Input id="api-id" type="password" placeholder="••••••••" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-hash">API Hash</Label>
                <Input id="api-hash" type="password" placeholder="••••••••" className="font-mono" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Get these from{' '}
              <a
                href="https://my.telegram.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-telegram hover:underline"
              >
                my.telegram.org
              </a>
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Rate Limit</Label>
                <span className="text-sm font-mono text-muted-foreground">
                  {rateLimit[0]} msg/sec
                </span>
              </div>
              <Slider
                value={rateLimit}
                onValueChange={setRateLimit}
                min={0.5}
                max={5}
                step={0.5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum messages per second to avoid Telegram rate limits
              </p>
            </div>

            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-authenticate Session
            </Button>
          </div>
        </div>

        {/* Tracked Authors Whitelist */}
        <TrackedAuthorsSection />

        {/* Banned Authors Blacklist */}
        <BannedAuthorsSection />

        {/* Message Formatting */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Message Formatting</h2>
              <p className="text-sm text-muted-foreground">Customize how messages appear in Telegram</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label>Include Channel Prefix</Label>
                <p className="text-xs text-muted-foreground">Add [#channel-name] to messages</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label>Include Author Name</Label>
                <p className="text-xs text-muted-foreground">Show who sent the original message</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label>Include Timestamp</Label>
                <p className="text-xs text-muted-foreground">Add original message time</p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label>Expand Link Previews</Label>
                <p className="text-xs text-muted-foreground">Let Telegram generate link previews</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Attachment Settings */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <Shield className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Attachments & Limits</h2>
              <p className="text-sm text-muted-foreground">Configure file handling</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Max Attachment Size</Label>
              <Select defaultValue="50">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 MB</SelectItem>
                  <SelectItem value="25">25 MB</SelectItem>
                  <SelectItem value="50">50 MB (Telegram limit)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label>Mirror Images</Label>
                <p className="text-xs text-muted-foreground">Forward image attachments</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label>Mirror PDFs</Label>
                <p className="text-xs text-muted-foreground">Forward PDF documents</p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <Label>Mirror Videos</Label>
                <p className="text-xs text-muted-foreground">Forward video files (size limits apply)</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
