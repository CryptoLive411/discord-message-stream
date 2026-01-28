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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tradeId, contractAddress, percentage }: { 
      tradeId: string; 
      contractAddress: string; 
      percentage: number;
    }) => {
      const workerKey = import.meta.env.VITE_WORKER_API_KEY || '123456789101112131415161718192021';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/solana-trader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-key': workerKey,
        },
        body: JSON.stringify({
          action: 'sell',
          data: {
            trade_id: tradeId,
            contract_address: contractAddress,
            percentage,
          },
        }),
      });

      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Sell failed');
      }

      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['openPositions'] });
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
      toast.success(`Sold for ${data.received_sol?.toFixed(4)} SOL`);
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
      const workerKey = import.meta.env.VITE_WORKER_API_KEY || '123456789101112131415161718192021';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/solana-trader`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-worker-key': workerKey,
        },
        body: JSON.stringify({
          action: 'buy',
          data: {
            contract_address: contractAddress,
            amount_sol: amountSol,
          },
        }),
      });

      const result = await response.json();
      
      if (!response.ok || result.error) {
        throw new Error(result.error || 'Buy failed');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['openPositions'] });
      queryClient.invalidateQueries({ queryKey: ['walletInfo'] });
      toast.success('Buy executed successfully');
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
