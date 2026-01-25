import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export interface EnhancedLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  channel?: string;
  details?: string;
  signalType?: string;
  authorName?: string;
  originalText?: string;
  formattedText?: string;
}

// Keep old LogEntry type for backwards compatibility
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  channel?: string;
  details?: string;
}

function transformLog(row: any): EnhancedLogEntry {
  // Parse metadata if it exists
  let metadata: any = {};
  if (row.metadata) {
    try {
      metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    } catch (e) {
      // ignore
    }
  }

  return {
    id: row.id,
    timestamp: new Date(row.created_at),
    level: row.level as 'info' | 'success' | 'warning' | 'error',
    message: row.message,
    channel: row.channel_name,
    details: row.details,
    signalType: row.signal_type || metadata?.signalType,
    authorName: row.author_name || metadata?.authorName,
    originalText: row.original_text || metadata?.originalText,
    formattedText: row.formatted_text || metadata?.formattedText,
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
    refetchInterval: 3000, // Refresh every 3 seconds for more responsive logs
  });
}

export function useRealtimeLogs(initialLogs: EnhancedLogEntry[] = []) {
  const [logs, setLogs] = useState<EnhancedLogEntry[]>(initialLogs);

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
          setLogs((prev) => [newLog, ...prev.slice(0, 199)]); // Keep more logs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return logs;
}
