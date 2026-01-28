import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  Target, 
  DollarSign, 
  XCircle, 
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    pending_sigma: {
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: 'Queued',
    },
    bought: {
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: <CheckCircle className="w-3 h-3" />,
      label: 'Bought',
    },
    partial_tp1: {
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: <Target className="w-3 h-3" />,
      label: 'TP1 Hit',
    },
    sold: {
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      icon: <DollarSign className="w-3 h-3" />,
      label: 'Sold',
    },
    failed: {
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: <XCircle className="w-3 h-3" />,
      label: 'Failed',
    },
    stopped: {
      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      icon: <AlertTriangle className="w-3 h-3" />,
      label: 'Stopped',
    },
  };

  const fallbackLabel = status.replace(/_/g, ' ');
  const variant = variants[status] || {
    color: 'bg-muted text-muted-foreground border-border',
    icon: <Clock className="w-3 h-3" />,
    label: fallbackLabel,
  };

  return (
    <Badge variant="outline" className={`${variant.color} flex items-center gap-1`}>
      {variant.icon}
      {variant.label}
    </Badge>
  );
}
