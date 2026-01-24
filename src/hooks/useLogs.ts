import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LogEntry } from '@/types';
import { useEffect, useState } from 'react';

function transformLog(row: any): LogEntry {
  return {
    id: row.id,
    timestamp: new Date(row.created_at),
    level: row.level as 'info' | 'success' | 'warning' | 'error',
    message: row.message,
    channel: row.channel_name,
    details: row.details,
  };
}

export function useLogs(limit = 100) {
  return useQuery({
    queryKey: ['logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relay_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data.map(transformLog);
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useRealtimeLogs(initialLogs: LogEntry[] = []) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);

  useEffect(() => {
    // Set initial logs
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    const channel = supabase
      .channel('relay_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'relay_logs',
        },
        (payload) => {
          const newLog = transformLog(payload.new);
          setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return logs;
}
