import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkerCommand {
  id: string;
  command: string;
  status: 'pending' | 'executed' | 'failed';
  createdAt: Date;
  executedAt?: Date;
  result?: string;
}

interface WorkerStatus {
  isRunning: boolean;
  lastPing?: Date;
  errorMessage?: string;
}

export function useWorkerStatus() {
  return useQuery({
    queryKey: ['workerStatus'],
    queryFn: async (): Promise<WorkerStatus> => {
      const { data, error } = await supabase
        .from('connection_status')
        .select('*')
        .eq('service', 'worker')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const lastPing = data?.last_ping_at ? new Date(data.last_ping_at) : undefined;
      const isRunning = data?.status === 'connected' && lastPing 
        ? (Date.now() - lastPing.getTime()) < 30000 // Consider online if ping within 30s
        : false;

      return {
        isRunning,
        lastPing,
        errorMessage: data?.error_message,
      };
    },
    refetchInterval: 5000,
  });
}

export function useWorkerCommands() {
  return useQuery({
    queryKey: ['workerCommands'],
    queryFn: async (): Promise<WorkerCommand[]> => {
      // Cast to any to handle new table not yet in generated types
      const { data, error } = await (supabase as any)
        .from('worker_commands')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map((row: any) => ({
        id: row.id,
        command: row.command,
        status: row.status,
        createdAt: new Date(row.created_at),
        executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
        result: row.result,
      }));
    },
    refetchInterval: 3000,
  });
}

export function useSendWorkerCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (command: 'start' | 'stop' | 'restart' | 'sync_channels') => {
      // Cast to any to handle new table not yet in generated types
      const { data, error } = await (supabase as any)
        .from('worker_commands')
        .insert({ command, status: 'pending' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, command) => {
      queryClient.invalidateQueries({ queryKey: ['workerCommands'] });
      toast.success(`Command "${command}" sent to worker`);
    },
    onError: (error) => {
      toast.error(`Failed to send command: ${error.message}`);
    },
  });
}
