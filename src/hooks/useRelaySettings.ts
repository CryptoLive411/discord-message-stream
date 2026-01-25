import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RelaySettings {
  aiParserEnabled: boolean;
  logLevel: 'minimal' | 'normal' | 'verbose';
}

export function useRelaySettings() {
  return useQuery({
    queryKey: ['relaySettings'],
    queryFn: async (): Promise<RelaySettings> => {
      const { data, error } = await supabase
        .from('relay_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settings: RelaySettings = {
        aiParserEnabled: true,
        logLevel: 'verbose',
      };

      data?.forEach((row: { setting_key: string; setting_value: unknown }) => {
        if (row.setting_key === 'ai_parser_enabled') {
          settings.aiParserEnabled = row.setting_value === true || row.setting_value === 'true';
        }
        if (row.setting_key === 'log_level') {
          const value = typeof row.setting_value === 'string' 
            ? row.setting_value.replace(/"/g, '') 
            : row.setting_value;
          settings.logLevel = value as 'minimal' | 'normal' | 'verbose';
        }
      });

      return settings;
    },
  });
}

export function useUpdateRelaySetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      // First try to update
      const { data: existing } = await supabase
        .from('relay_settings')
        .select('id')
        .eq('setting_key', key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('relay_settings')
          .update({ 
            setting_value: value as any,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('relay_settings')
          .insert({ 
            setting_key: key, 
            setting_value: value as any,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relaySettings'] });
    },
    onError: (error) => {
      toast.error(`Failed to update setting: ${error.message}`);
    },
  });
}
