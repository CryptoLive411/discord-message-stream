import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TelegramDestination } from '@/types';
import { toast } from 'sonner';

function transformConfig(row: any): TelegramDestination {
  return {
    type: row.destination_type as 'channel' | 'group',
    identifier: row.identifier,
    name: row.name,
    useTopics: row.use_topics,
    topics: [], // Topics are derived from discord_channels
  };
}

export function useTelegramConfig() {
  return useQuery({
    queryKey: ['telegramConfig'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('telegram_config')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return transformConfig(data);
    },
  });
}

export function useSaveTelegramConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: {
      destinationType: 'channel' | 'group';
      identifier: string;
      name: string;
      useTopics: boolean;
    }) => {
      // Delete existing config
      await supabase.from('telegram_config').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert new config
      const { data, error } = await supabase
        .from('telegram_config')
        .insert({
          destination_type: config.destinationType,
          identifier: config.identifier,
          name: config.name,
          use_topics: config.useTopics,
        })
        .select()
        .single();

      if (error) throw error;
      return transformConfig(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegramConfig'] });
      toast.success('Telegram configuration saved');
    },
    onError: (error) => {
      toast.error(`Failed to save config: ${error.message}`);
    },
  });
}
