import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DiscordChannel } from '@/types';
import { toast } from 'sonner';

// Transform database row to frontend type
function transformChannel(row: any): DiscordChannel {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    serverId: row.server_id,
    serverName: row.server_name,
    enabled: row.enabled,
    mirrorAttachments: row.mirror_attachments,
    mirrorReplies: row.mirror_replies,
    telegramTopicId: row.telegram_topic_id,
    telegramTopicName: row.telegram_topic_name,
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
    lastMessageFingerprint: row.last_message_fingerprint,
    messageCount: row.message_count,
    status: row.status as 'active' | 'degraded' | 'error',
  };
}

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discord_channels')
        .select('*')
        .order('name');

      if (error) throw error;
      return data.map(transformChannel);
    },
  });
}

export function useAddChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channel: {
      url: string;
      name: string;
      serverId: string;
      serverName: string;
      mirrorAttachments: boolean;
      mirrorReplies: boolean;
      telegramTopicName?: string;
    }) => {
      const { data, error } = await supabase
        .from('discord_channels')
        .insert({
          url: channel.url,
          name: channel.name,
          server_id: channel.serverId,
          server_name: channel.serverName,
          mirror_attachments: channel.mirrorAttachments,
          mirror_replies: channel.mirrorReplies,
          telegram_topic_name: channel.telegramTopicName || channel.name,
        })
        .select()
        .single();

      if (error) throw error;
      return transformChannel(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel added successfully');
    },
    onError: (error) => {
      toast.error(`Failed to add channel: ${error.message}`);
    },
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DiscordChannel> & { id: string }) => {
      const dbUpdates: Record<string, any> = {};
      if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
      if (updates.mirrorAttachments !== undefined) dbUpdates.mirror_attachments = updates.mirrorAttachments;
      if (updates.mirrorReplies !== undefined) dbUpdates.mirror_replies = updates.mirrorReplies;
      if (updates.telegramTopicId !== undefined) dbUpdates.telegram_topic_id = updates.telegramTopicId;
      if (updates.telegramTopicName !== undefined) dbUpdates.telegram_topic_name = updates.telegramTopicName;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { error } = await supabase
        .from('discord_channels')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
    onError: (error) => {
      toast.error(`Failed to update channel: ${error.message}`);
    },
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discord_channels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success('Channel deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete channel: ${error.message}`);
    },
  });
}
