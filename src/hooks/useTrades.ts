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
  // Optional auto-sell strategy fields (not yet in DB)
  auto_sell_enabled?: boolean;
  trailing_stop_enabled?: boolean;
  trailing_stop_pct?: number | null;
  highest_price?: number | null;
  time_based_sell_at?: string | null;
  auto_sell_reason?: string | null;
  priority?: string;
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
  // Optional auto-sell strategy fields (not yet in DB)
  auto_sell_enabled?: boolean;
  trailing_stop_enabled?: boolean;
  trailing_stop_pct?: number | null;
  time_based_sell_enabled?: boolean;
  time_based_sell_minutes?: number | null;
  priority?: 'high' | 'medium' | 'low';
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

// Fetch open positions (including queued trades)
export function useOpenPositions() {
  return useQuery({
    queryKey: ['openPositions'],
    queryFn: async (): Promise<Trade[]> => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .in('status', ['pending_sigma', 'bought', 'partial_tp1'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 3000, // Refresh every 3 seconds for real-time updates
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

// Queue manual sell request for worker execution
export function useExecuteSell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      tradeId, 
      percentage = 100,
      slippageBps = 100,
    }: { 
      tradeId: string; 
      contractAddress: string; 
      percentage: number;
      slippageBps?: number;
    }) => {
      // Queue a sell request; the Python worker will execute it via Jupiter.
      const { data, error } = await supabase
        .from('sell_requests')
        .insert({
          trade_id: tradeId,
          percentage,
          slippage_bps: slippageBps,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { percentage }) => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['openPositions'] });
      queryClient.invalidateQueries({ queryKey: ['sellRequests'] });
      toast.success(`Sell ${percentage}% queued — worker will execute shortly`);
    },
    onError: (error) => {
      toast.error(`Sell failed: ${error.message}`);
    },
  });
}

// Fetch pending sell requests
export function useSellRequests() {
  return useQuery({
    queryKey: ['sellRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sell_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
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

// Update a trade record (for auto-sell toggles, etc.)
export function useUpdateTrade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Trade> & { id: string }) => {
      const { id, ...data } = updates;
      const { error } = await supabase
        .from('trades')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      queryClient.invalidateQueries({ queryKey: ['openPositions'] });
      toast.success('Trade updated');
    },
    onError: (error) => {
      toast.error(`Failed to update trade: ${error.message}`);
    },
  });
}
