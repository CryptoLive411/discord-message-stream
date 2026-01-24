import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'discord' | 'telegram' | 'success' | 'warning';
}

const variantStyles = {
  default: 'border-border/50',
  discord: 'border-discord/30 bg-discord/5',
  telegram: 'border-telegram/30 bg-telegram/5',
  success: 'border-success/30 bg-success/5',
  warning: 'border-warning/30 bg-warning/5',
};

const iconVariantStyles = {
  default: 'text-muted-foreground',
  discord: 'text-discord',
  telegram: 'text-telegram',
  success: 'text-success',
  warning: 'text-warning',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  variant = 'default',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'glass-card rounded-xl p-5 transition-all duration-200 hover:shadow-lg',
        variantStyles[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
        </div>
        <div
          className={cn(
            'p-2.5 rounded-lg bg-muted/50',
            variant !== 'default' && 'bg-current/10'
          )}
        >
          <Icon className={cn('w-5 h-5', iconVariantStyles[variant])} />
        </div>
      </div>
    </div>
  );
}
