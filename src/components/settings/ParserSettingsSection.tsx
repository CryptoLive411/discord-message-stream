import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useRelaySettings, useUpdateRelaySetting } from '@/hooks/useRelaySettings';
import { Brain, Activity, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function ParserSettingsSection() {
  const { data: settings, isLoading } = useRelaySettings();
  const updateSetting = useUpdateRelaySetting();

  const handleParserToggle = (enabled: boolean) => {
    updateSetting.mutate(
      { key: 'ai_parser_enabled', value: enabled },
      {
        onSuccess: () => {
          toast.success(enabled ? 'AI Parser enabled' : 'AI Parser disabled - raw messages will be sent');
        },
      }
    );
  };

  const handleLogLevelChange = (level: string) => {
    updateSetting.mutate(
      { key: 'log_level', value: level },
      {
        onSuccess: () => {
          toast.success(`Log level set to ${level}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-muted rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">AI Signal Parser</h2>
            <Badge variant={settings?.aiParserEnabled ? 'default' : 'secondary'}>
              {settings?.aiParserEnabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Automatically filter noise and format trade signals
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <Zap className="w-4 h-4 text-yellow-500" />
            <div>
              <Label>Enable AI Parser</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, filters noise and extracts CAs/trades. When disabled, sends raw messages.
              </p>
            </div>
          </div>
          <Switch
            checked={settings?.aiParserEnabled ?? true}
            onCheckedChange={handleParserToggle}
            disabled={updateSetting.isPending}
          />
        </div>

        <div className="p-3 rounded-lg border border-border space-y-2">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-blue-500" />
            <div>
              <Label>Log Detail Level</Label>
              <p className="text-xs text-muted-foreground">
                How much detail to show in the dashboard logs
              </p>
            </div>
          </div>
          <Select
            value={settings?.logLevel ?? 'verbose'}
            onValueChange={handleLogLevelChange}
            disabled={updateSetting.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minimal">Minimal - Errors only</SelectItem>
              <SelectItem value="normal">Normal - Signals + errors</SelectItem>
              <SelectItem value="verbose">Verbose - Everything including skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {settings?.aiParserEnabled && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
            <p className="font-medium">Parser will:</p>
            <ul className="text-muted-foreground space-y-1 ml-4">
              <li>✅ Extract Contract Addresses (Solana/ETH)</li>
              <li>✅ Format leverage trades (Entry/SL/TP)</li>
              <li>✅ Skip noise ("wow", "nice", reactions)</li>
              <li>✅ Add clean formatting for Telegram</li>
            </ul>
          </div>
        )}

        {!settings?.aiParserEnabled && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-sm">
            <p className="text-yellow-600 dark:text-yellow-400">
              ⚠️ Raw mode: All messages will be forwarded without filtering or formatting
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
