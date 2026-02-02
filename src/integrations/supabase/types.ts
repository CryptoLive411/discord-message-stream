export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      banned_authors: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          username?: string
        }
        Relationships: []
      }
      connection_status: {
        Row: {
          error_message: string | null
          id: string
          last_ping_at: string | null
          service: string
          status: string
          updated_at: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          last_ping_at?: string | null
          service: string
          status?: string
          updated_at?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          last_ping_at?: string | null
          service?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      discord_channels: {
        Row: {
          bypass_parser: boolean
          created_at: string
          enabled: boolean
          id: string
          last_message_at: string | null
          last_message_fingerprint: string | null
          message_count: number
          mirror_attachments: boolean
          mirror_replies: boolean
          name: string
          server_id: string
          server_name: string
          status: string
          telegram_topic_id: string | null
          telegram_topic_name: string | null
          updated_at: string
          url: string
        }
        Insert: {
          bypass_parser?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          last_message_at?: string | null
          last_message_fingerprint?: string | null
          message_count?: number
          mirror_attachments?: boolean
          mirror_replies?: boolean
          name: string
          server_id: string
          server_name: string
          status?: string
          telegram_topic_id?: string | null
          telegram_topic_name?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          bypass_parser?: boolean
          created_at?: string
          enabled?: boolean
          id?: string
          last_message_at?: string | null
          last_message_fingerprint?: string | null
          message_count?: number
          mirror_attachments?: boolean
          mirror_replies?: boolean
          name?: string
          server_id?: string
          server_name?: string
          status?: string
          telegram_topic_id?: string | null
          telegram_topic_name?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      message_queue: {
        Row: {
          attachment_urls: string[] | null
          author_name: string
          channel_id: string | null
          created_at: string
          discord_message_id: string | null
          error_message: string | null
          fingerprint: string
          id: string
          message_text: string
          retry_count: number
          sent_at: string | null
          status: string
        }
        Insert: {
          attachment_urls?: string[] | null
          author_name: string
          channel_id?: string | null
          created_at?: string
          discord_message_id?: string | null
          error_message?: string | null
          fingerprint: string
          id?: string
          message_text: string
          retry_count?: number
          sent_at?: string | null
          status?: string
        }
        Update: {
          attachment_urls?: string[] | null
          author_name?: string
          channel_id?: string | null
          created_at?: string
          discord_message_id?: string | null
          error_message?: string | null
          fingerprint?: string
          id?: string
          message_text?: string
          retry_count?: number
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "discord_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      relay_logs: {
        Row: {
          author_name: string | null
          channel_name: string | null
          created_at: string
          details: string | null
          formatted_text: string | null
          id: string
          level: string
          message: string
          metadata: Json | null
          original_text: string | null
          signal_type: string | null
        }
        Insert: {
          author_name?: string | null
          channel_name?: string | null
          created_at?: string
          details?: string | null
          formatted_text?: string | null
          id?: string
          level: string
          message: string
          metadata?: Json | null
          original_text?: string | null
          signal_type?: string | null
        }
        Update: {
          author_name?: string | null
          channel_name?: string | null
          created_at?: string
          details?: string | null
          formatted_text?: string | null
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          original_text?: string | null
          signal_type?: string | null
        }
        Relationships: []
      }
      relay_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sell_requests: {
        Row: {
          created_at: string
          error_message: string | null
          executed_at: string | null
          id: string
          percentage: number
          realized_sol: number | null
          slippage_bps: number
          status: string
          trade_id: string
          tx_hash: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          percentage?: number
          realized_sol?: number | null
          slippage_bps?: number
          status?: string
          trade_id: string
          tx_hash?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          percentage?: number
          realized_sol?: number | null
          slippage_bps?: number
          status?: string
          trade_id?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sell_requests_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      system_stats: {
        Row: {
          id: string
          stat_name: string
          stat_value: number
          updated_at: string
        }
        Insert: {
          id?: string
          stat_name: string
          stat_value?: number
          updated_at?: string
        }
        Update: {
          id?: string
          stat_name?: string
          stat_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      telegram_config: {
        Row: {
          created_at: string
          destination_type: string
          id: string
          identifier: string
          name: string
          updated_at: string
          use_topics: boolean
        }
        Insert: {
          created_at?: string
          destination_type: string
          id?: string
          identifier: string
          name: string
          updated_at?: string
          use_topics?: boolean
        }
        Update: {
          created_at?: string
          destination_type?: string
          id?: string
          identifier?: string
          name?: string
          updated_at?: string
          use_topics?: boolean
        }
        Relationships: []
      }
      tracked_authors: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          username?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          allocation_sol: number
          author_name: string | null
          auto_sell_enabled: boolean
          auto_sell_reason: string | null
          buy_tx_hash: string | null
          chain: string
          channel_category: string | null
          channel_id: string | null
          channel_name: string
          contract_address: string
          created_at: string
          current_price: number | null
          entry_price: number | null
          error_message: string | null
          highest_price: number | null
          id: string
          message_fingerprint: string | null
          message_preview: string | null
          priority: string
          realized_pnl_sol: number | null
          retry_count: number
          sell_tx_hash: string | null
          sigma_buy_sent_at: string | null
          sigma_sell_sent_at: string | null
          source_author: string | null
          status: string
          stop_loss_pct: number
          take_profit_1_pct: number
          take_profit_2_pct: number
          time_based_sell_at: string | null
          token_symbol: string | null
          trailing_stop_enabled: boolean
          trailing_stop_pct: number | null
          updated_at: string
        }
        Insert: {
          allocation_sol: number
          author_name?: string | null
          auto_sell_enabled?: boolean
          auto_sell_reason?: string | null
          buy_tx_hash?: string | null
          chain?: string
          channel_category?: string | null
          channel_id?: string | null
          channel_name: string
          contract_address: string
          created_at?: string
          current_price?: number | null
          entry_price?: number | null
          error_message?: string | null
          highest_price?: number | null
          id?: string
          message_fingerprint?: string | null
          message_preview?: string | null
          priority?: string
          realized_pnl_sol?: number | null
          retry_count?: number
          sell_tx_hash?: string | null
          sigma_buy_sent_at?: string | null
          sigma_sell_sent_at?: string | null
          source_author?: string | null
          status?: string
          stop_loss_pct?: number
          take_profit_1_pct?: number
          take_profit_2_pct?: number
          time_based_sell_at?: string | null
          token_symbol?: string | null
          trailing_stop_enabled?: boolean
          trailing_stop_pct?: number | null
          updated_at?: string
        }
        Update: {
          allocation_sol?: number
          author_name?: string | null
          auto_sell_enabled?: boolean
          auto_sell_reason?: string | null
          buy_tx_hash?: string | null
          chain?: string
          channel_category?: string | null
          channel_id?: string | null
          channel_name?: string
          contract_address?: string
          created_at?: string
          current_price?: number | null
          entry_price?: number | null
          error_message?: string | null
          highest_price?: number | null
          id?: string
          message_fingerprint?: string | null
          message_preview?: string | null
          priority?: string
          realized_pnl_sol?: number | null
          retry_count?: number
          sell_tx_hash?: string | null
          sigma_buy_sent_at?: string | null
          sigma_sell_sent_at?: string | null
          source_author?: string | null
          status?: string
          stop_loss_pct?: number
          take_profit_1_pct?: number
          take_profit_2_pct?: number
          time_based_sell_at?: string | null
          token_symbol?: string | null
          trailing_stop_enabled?: boolean
          trailing_stop_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "discord_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_config: {
        Row: {
          allocation_sol: number
          auto_sell_enabled: boolean
          channel_pattern: string
          created_at: string
          enabled: boolean
          id: string
          notes: string | null
          priority: string
          stop_loss_pct: number
          take_profit_1_pct: number
          take_profit_2_pct: number
          time_based_sell_enabled: boolean
          time_based_sell_minutes: number | null
          trailing_stop_enabled: boolean
          trailing_stop_pct: number | null
          updated_at: string
        }
        Insert: {
          allocation_sol?: number
          auto_sell_enabled?: boolean
          channel_pattern: string
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          priority?: string
          stop_loss_pct?: number
          take_profit_1_pct?: number
          take_profit_2_pct?: number
          time_based_sell_enabled?: boolean
          time_based_sell_minutes?: number | null
          trailing_stop_enabled?: boolean
          trailing_stop_pct?: number | null
          updated_at?: string
        }
        Update: {
          allocation_sol?: number
          auto_sell_enabled?: boolean
          channel_pattern?: string
          created_at?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          priority?: string
          stop_loss_pct?: number
          take_profit_1_pct?: number
          take_profit_2_pct?: number
          time_based_sell_enabled?: boolean
          time_based_sell_minutes?: number | null
          trailing_stop_enabled?: boolean
          trailing_stop_pct?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      worker_commands: {
        Row: {
          command: string
          created_at: string
          executed_at: string | null
          id: string
          result: string | null
          status: string
        }
        Insert: {
          command: string
          created_at?: string
          executed_at?: string | null
          id?: string
          result?: string | null
          status?: string
        }
        Update: {
          command?: string
          created_at?: string
          executed_at?: string | null
          id?: string
          result?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_message_count: { Args: { row_id: string }; Returns: number }
      increment_stat: { Args: { stat_key: string }; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
