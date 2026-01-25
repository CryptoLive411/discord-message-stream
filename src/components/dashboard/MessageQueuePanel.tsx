import { useState } from 'react';
import { useQueuedMessages, useApproveMessage, useRejectMessage, useDeleteQueuedMessage, QueuedMessage } from '@/hooks/useMessageQueue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Trash2, ChevronDown, ChevronUp, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function MessageCard({ message, onApprove, onReject, onDelete }: {
  message: QueuedMessage;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isFailed = message.status === 'failed';
  const isStuck = message.retryCount >= 3 || isFailed;

  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      isFailed ? 'bg-destructive/5 border-destructive/30' : 
      isStuck ? 'bg-warning/5 border-warning/30' : 
      'bg-muted/30 border-border/50'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-foreground truncate">
              {message.authorName}
            </span>
            {message.channelName && (
              <Badge variant="outline" className="text-xs">
                #{message.channelName}
              </Badge>
            )}
            <Badge 
              variant={isFailed ? 'destructive' : 'secondary'} 
              className="text-xs"
            >
              {isFailed ? (
                <><AlertCircle className="w-3 h-3 mr-1" /> Failed</>
              ) : message.retryCount > 0 ? (
                <><RefreshCw className="w-3 h-3 mr-1" /> Retry {message.retryCount}</>
              ) : (
                <><Clock className="w-3 h-3 mr-1" /> Pending</>
              )}
            </Badge>
          </div>
          
          <p className={`text-sm text-muted-foreground mt-1 ${expanded ? '' : 'line-clamp-2'}`}>
            {message.messageText}
          </p>
          
          {message.messageText.length > 100 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
            >
              {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
            </button>
          )}

          {message.errorMessage && (
            <p className="text-xs text-destructive mt-2 p-2 bg-destructive/10 rounded">
              Error: {message.errorMessage}
            </p>
          )}
          
          <p className="text-xs text-muted-foreground/60 mt-2">
            {formatDistanceToNow(message.createdAt, { addSuffix: true })}
          </p>
        </div>

        {/* Only show action buttons for stuck/failed messages */}
        {isStuck && (
          <div className="flex flex-col gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
              onClick={onApprove}
              title="Approve & Retry"
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onReject}
              title="Reject"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageQueuePanel() {
  const { data: messages = [], isLoading } = useQueuedMessages();
  const approveMessage = useApproveMessage();
  const rejectMessage = useRejectMessage();
  const deleteMessage = useDeleteQueuedMessage();

  // Filter to only show stuck messages (failed or high retry count)
  const stuckMessages = messages.filter(m => m.status === 'failed' || m.retryCount >= 3);
  const pendingMessages = messages.filter(m => m.status === 'pending' && m.retryCount < 3);

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-foreground">Message Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stuckMessages.length > 0 
              ? `${stuckMessages.length} stuck message${stuckMessages.length > 1 ? 's' : ''} need attention`
              : `${pendingMessages.length} messages processing normally`
            }
          </p>
        </div>
        <Badge variant={stuckMessages.length > 0 ? 'destructive' : 'secondary'}>
          {messages.length} in queue
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Queue is empty</p>
          <p className="text-xs mt-1">Messages appear here when pending or failed</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px] pr-2">
          <div className="space-y-2">
            {/* Stuck messages first (need attention) */}
            {stuckMessages.length > 0 && (
              <>
                <p className="text-xs font-medium text-destructive uppercase tracking-wide">
                  Needs Attention
                </p>
                {stuckMessages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onApprove={() => approveMessage.mutate(message.id)}
                    onReject={() => rejectMessage.mutate(message.id)}
                    onDelete={() => deleteMessage.mutate(message.id)}
                  />
                ))}
              </>
            )}

            {/* Normal pending messages (auto-processing) */}
            {pendingMessages.length > 0 && (
              <>
                {stuckMessages.length > 0 && <div className="h-4" />}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Processing Normally
                </p>
                {pendingMessages.slice(0, 5).map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onApprove={() => approveMessage.mutate(message.id)}
                    onReject={() => rejectMessage.mutate(message.id)}
                    onDelete={() => deleteMessage.mutate(message.id)}
                  />
                ))}
                {pendingMessages.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    +{pendingMessages.length - 5} more processing...
                  </p>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
