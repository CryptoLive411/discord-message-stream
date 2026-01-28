import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Trade {
  id: string;
  contract_address: string;
  token_symbol: string | null;
  chain: string;
  channel_id: string | null;
  channel_name: string;
  message_fingerprint: string | null;
  author_name: string | null;
  allocation_sol: number;
  stop_loss_pct: number;
  take_profit_1_pct: number;
  take_profit_2_pct: number;
  status: string;
  entry_price: number | null;
  current_price: number | null;
  buy_tx_hash: string | null;
  sell_tx_hash: string | null;
  sigma_buy_sent_at: string | null;
  sigma_sell_sent_at: string | null;
  realized_pnl_sol: number | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface TradePosition extends Trade {
  token_balance?: number;
  current_value_sol?: number;
  pnl_sol?: number;
  pnl_percent?: number;
}

export interface TradingConfig {
  id: string;
  channel_pattern: string;
  enabled: boolean;
  allocation_sol: number;
  stop_loss_pct: number;
  take_profit_1_pct: number;
  take_profit_2_pct: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all trades
export function useTrades(limit = 100) {
  return useQuery({
    queryKey: ['trades', limit],
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

// Fetch open positions only
export function useOpenPositions() {
  return useQuery({
    queryKey: ['openPositions'],
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .in('status', ['bought', 'partial_tp1', 'pending_sigma'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000, // Refresh every 5 seconds for active positions
  });
}

// Fetch trading configs
export function useTradingConfigs() {
  return useQuery({
    queryKey: ['tradingConfigs'],
    queryFn: async (): Promise<TradingConfig[]> => {
      const { data, error } = await supabase
        .from('trading_config')
        .select('*')
        .order('channel_pattern');

      if (error) throw error;
      return data || [];
    },
  });
}

// Update trading config
export function useUpdateTradingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<TradingConfig> & { id: string }) => {
      const { error } = await supabase
        .from('trading_config')
        .update({
          ...config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingConfigs'] });
      toast.success('Trading config updated');
    },
    onError: (error) => {
      toast.error(`Failed to update config: ${error.message}`);
    },
  });
}

// Create trading config
export function useCreateTradingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Omit<TradingConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('trading_config')
        .insert(config);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingConfigs'] });
      toast.success('Trading config created');
    },
    onError: (error) => {
      toast.error(`Failed to create config: ${error.message}`);
    },
  });
}

// Delete trading config
export function useDeleteTradingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trading_config')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tradingConfigs'] });
      toast.success('Trading config deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete config: ${error.message}`);
    },
  });
}

// Get wallet info from edge function
export function useWalletInfo() {
  return useQuery({
    queryKey: ['walletInfo'],
    queryFn: async () => {
      const workerKey = import.meta.env.VITE_WORKER_API_KEY || '123456789101112131415161718192021';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/solana-trader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-key': workerKey,
        },
        body: JSON.stringify({ action: 'get_wallet' }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch wallet info');
      }

      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 1,
  });
}

// Execute manual sell
export function useExecuteSell() {
  return useMutation<{ success: boolean }, Error, { 
    tradeId: string; 
    contractAddress: string; 
    percentage: number;
  }>({
    mutationFn: async () => {
      // Trading execution is handled by the self-hosted Python worker (Jupiter direct).
      // We intentionally do NOT execute sells from the hosted backend function because
      // it cannot reliably resolve Jupiter endpoints (DNS failures).
      throw new Error('Manual sells are disabled in the dashboard. Use the worker-based execution flow.');
    },
    onError: (error) => {
      toast.error(`Sell failed: ${error.message}`);
    },
  });
}

// Execute manual buy
export function useExecuteBuy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contractAddress, amountSol }: { 
      contractAddress: string; 
      amountSol: number;
    }) => {
      // Queue a trade record; the Python worker will execute it via Jupiter.
      const now = new Date();
      const { data, error } = await supabase
        .from('trades')
        .insert({
          contract_address: contractAddress,
          chain: 'solana',
          channel_name: 'manual',
          allocation_sol: amountSol,
          status: 'pending_sigma',
          // Defaults aligned with current strategy (-30% SL, +100%/+200% TP)
          stop_loss_pct: -30,
          take_profit_1_pct: 100,
          take_profit_2_pct: 200,
          // Optional metadata
          author_name: 'manual',
          message_fingerprint: `manual:${now.toISOString()}`,
          retry_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['openPositions'] });
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
      toast.success('Buy queued — worker will execute shortly');
    },
    onError: (error) => {
      toast.error(`Buy failed: ${error.message}`);
    },
  });
}

// Delete a trade record
export function useDeleteTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trades')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['openPositions'] });
      toast.success('Trade deleted');
    },
    onError: (error) => {
      toast.error(`Failed to delete trade: ${error.message}`);
    },
  });
}
