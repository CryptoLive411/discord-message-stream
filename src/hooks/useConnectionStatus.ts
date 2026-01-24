import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ConnectionStatus } from '@/types';

export function useConnectionStatus() {
  return useQuery({
    queryKey: ['connectionStatus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connection_status')
        .select('*');

      if (error) throw error;

      const statusMap = data.reduce((acc, row) => {
        acc[row.service] = {
          status: row.status,
          lastPing: row.last_ping_at ? new Date(row.last_ping_at) : undefined,
          errorMessage: row.error_message,
        };
        return acc;
      }, {} as Record<string, { status: string; lastPing?: Date; errorMessage?: string }>);

      const connectionStatus: ConnectionStatus = {
        discord: (statusMap['discord']?.status || 'disconnected') as ConnectionStatus['discord'],
        telegram: (statusMap['telegram']?.status || 'disconnected') as ConnectionStatus['telegram'],
        lastDiscordPing: statusMap['discord']?.lastPing,
        lastTelegramPing: statusMap['telegram']?.lastPing,
      };

      return connectionStatus;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
