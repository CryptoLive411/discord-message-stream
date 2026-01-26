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
