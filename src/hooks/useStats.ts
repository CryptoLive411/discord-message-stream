import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SystemStats } from '@/types';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_stats')
        .select('*');

      if (error) throw error;

      // Convert array to object
      const statsMap = data.reduce((acc, stat) => {
        acc[stat.stat_name] = stat.stat_value;
        return acc;
      }, {} as Record<string, number>);

      // Get queue size
      const { count: queueSize } = await supabase
        .from('message_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get messages in last hour
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count: messagesHour } = await supabase
        .from('message_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', hourAgo);

      // Get messages today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: messagesToday } = await supabase
        .from('message_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', todayStart.toISOString());

      // Get failed attachments (messages with attachments that failed)
      const { count: attachmentFailures } = await supabase
        .from('message_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .not('attachment_urls', 'eq', '{}');

      const stats: SystemStats = {
        messagesForwardedHour: messagesHour || 0,
        messagesForwardedDay: messagesToday || 0,
        queueSize: queueSize || 0,
        attachmentFailures: attachmentFailures || 0,
        uptime: statsMap['uptime'] || 0,
      };

      return stats;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}
