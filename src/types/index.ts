export interface DiscordChannel {
  id: string;
  name: string;
  url: string;
  serverId: string;
  serverName: string;
  enabled: boolean;
  mirrorAttachments: boolean;
  mirrorReplies: boolean;
  telegramTopicId?: string;
  telegramTopicName?: string;
  lastMessageAt?: Date;
  messageCount: number;
  status: 'active' | 'degraded' | 'error';
}

export interface TelegramDestination {
  type: 'channel' | 'group';
  identifier: string;
  name: string;
  useTopics: boolean;
  topics: TelegramTopic[];
}

export interface TelegramTopic {
  id: string;
  name: string;
  discordChannelId?: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  channel?: string;
  details?: string;
}

export interface SystemStats {
  messagesForwardedHour: number;
  messagesForwardedDay: number;
  queueSize: number;
  attachmentFailures: number;
  uptime: number;
}

export interface ConnectionStatus {
  discord: 'connected' | 'disconnected' | 'needs-login';
  telegram: 'connected' | 'disconnected' | 'needs-auth';
  lastDiscordPing?: Date;
  lastTelegramPing?: Date;
}
