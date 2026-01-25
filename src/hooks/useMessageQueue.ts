import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface QueuedMessage {
  id: string;
  fingerprint: string;
  discordMessageId: string | null;
  authorName: string;
  messageText: string;
  attachmentUrls: string[];
  status: string;
  retryCount: number;
  errorMessage: string | null;
  createdAt: Date;
  channelName?: string;
  serverName?: string;
}

function transformMessage(row: any): QueuedMessage {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    discordMessageId: row.discord_message_id,
    authorName: row.author_name,
    messageText: row.message_text,
    attachmentUrls: row.attachment_urls || [],
    status: row.status,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
    createdAt: new Date(row.created_at),
    channelName: row.discord_channels?.name,
    serverName: row.discord_channels?.server_name,
  };
}

export function useQueuedMessages() {
  return useQuery({
    queryKey: ['queued-messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_queue')
        .select(`
          *,
          discord_channels (
            name,
            server_name
          )
        `)
        .in('status', ['pending', 'failed'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data.map(transformMessage);
    },
    refetchInterval: 3000, // Refresh every 3 seconds
  });
}

export function useApproveMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      // Reset retry count and set back to pending so worker picks it up
      const { error } = await supabase
        .from('message_queue')
        .update({ 
          status: 'pending',
          retry_count: 0,
          error_message: null
        })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queued-messages'] });
      toast.success('Message approved for sending');
    },
    onError: (error) => {
      toast.error(`Failed to approve message: ${error.message}`);
    },
  });
}

export function useRejectMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      // Mark as rejected so it won't be picked up again
      const { error } = await supabase
        .from('message_queue')
        .update({ status: 'rejected' })
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queued-messages'] });
      toast.success('Message rejected');
    },
    onError: (error) => {
      toast.error(`Failed to reject message: ${error.message}`);
    },
  });
}

export function useDeleteQueuedMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from('message_queue')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queued-messages'] });
      toast.success('Message deleted from queue');
    },
    onError: (error) => {
      toast.error(`Failed to delete message: ${error.message}`);
    },
  });
}
